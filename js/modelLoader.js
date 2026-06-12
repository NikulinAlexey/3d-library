import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { CONFIG } from "/3d-library/js/config.js";

const loaderGLTF = new GLTFLoader();
const loaderOBJ = new OBJLoader();
const loaderFBX = new FBXLoader();

// НОВАЯ ФУНКЦИЯ: прогрессивная загрузка с отчётом о прогрессе
export async function loadModelProgressive(scene, modelInfo, onProgress) {
  try {
    // Уведомляем о начале загрузки
    if (onProgress) onProgress(10);

    // Загружаем модель
    const model = await loadModelByFormat(modelInfo.path, modelInfo.format);

    if (onProgress) onProgress(60);

    // Настраиваем модель
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.roughness = mat.roughness ?? 0.4;
              mat.metalness = mat.metalness ?? 0.3;
            });
          } else {
            child.material.roughness = child.material.roughness ?? 0.4;
            child.material.metalness = child.material.metalness ?? 0.3;
          }
        }
      }
    });

    centerAndScaleModel(model);

    if (onProgress) onProgress(90);

    // Небольшая задержка перед добавлением в сцену, чтобы не блокировать UI
    await new Promise((resolve) => setTimeout(resolve, 50));

    scene.add(model);

    if (onProgress) onProgress(100);
    console.log(`✅ Model "${modelInfo.name}" loaded progressively`);
    return model;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Кеш для уже загруженных моделей (опционально, для улучшения производительности)
const modelCache = new Map();

function centerAndScaleModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = CONFIG.MODEL.targetHeight / maxDim;
  model.scale.set(scaleFactor, scaleFactor, scaleFactor);

  const newBox = new THREE.Box3().setFromObject(model);
  const deltaY = CONFIG.MODEL.groundY - newBox.min.y;
  model.position.y = deltaY;

  // Центрируем также по X и Z для красоты
  const centerX = (newBox.min.x + newBox.max.x) / 2;
  const centerZ = (newBox.min.z + newBox.max.z) / 2;
  model.position.x -= centerX;
  model.position.z -= centerZ;

  return model;
}

export function disposeModel(model) {
  if (!model) return;

  model.traverse((child) => {
    if (child.isMesh) {
      // Очищаем геометрию
      if (child.geometry) {
        child.geometry.dispose();
      }

      // Очищаем материалы и их текстуры
      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((material) => {
          // Очищаем текстуры материала
          if (material.map) material.map.dispose();
          if (material.lightMap) material.lightMap.dispose();
          if (material.bumpMap) material.bumpMap.dispose();
          if (material.normalMap) material.normalMap.dispose();
          if (material.specularMap) material.specularMap.dispose();
          if (material.envMap) material.envMap.dispose();
          if (material.alphaMap) material.alphaMap.dispose();
          if (material.aoMap) material.aoMap.dispose();
          if (material.displacementMap) material.displacementMap.dispose();
          if (material.emissiveMap) material.emissiveMap.dispose();
          if (material.metalnessMap) material.metalnessMap.dispose();
          if (material.roughnessMap) material.roughnessMap.dispose();

          // Очищаем сам материал
          material.dispose();
        });
      }
    }
  });

  // Очищаем скелетную анимацию, если есть
  if (model.isSkinnedMesh && model.skeleton) {
    model.skeleton.dispose();
  }

  // Очищаем кеш, если модель была там
  for (const [key, cached] of modelCache.entries()) {
    if (cached === model) {
      modelCache.delete(key);
      break;
    }
  }
}

function loadModelByFormat(path, format) {
  return new Promise((resolve, reject) => {
    // Проверяем кеш
    if (modelCache.has(path)) {
      console.log(`📦 Using cached model: ${path}`);
      // Возвращаем клон модели (глубокое копирование не делаем, но для AR это ок)
      resolve(modelCache.get(path).clone());
      return;
    }

    if (format === "glb" || format === "gltf") {
      loaderGLTF.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          modelCache.set(path, model);
          resolve(model);
        },
        undefined,
        (error) => reject(new Error(`GLTF error: ${error.message}`)),
      );
    } else if (format === "obj") {
      loaderOBJ.load(
        path,
        (obj) => {
          modelCache.set(path, obj);
          resolve(obj);
        },
        undefined,
        (error) => reject(new Error(`OBJ error: ${error.message}`)),
      );
    } else if (format === "fbx") {
      loaderFBX.load(
        path,
        (fbx) => {
          modelCache.set(path, fbx);
          resolve(fbx);
        },
        undefined,
        (error) => reject(new Error(`FBX error: ${error.message}`)),
      );
    } else {
      reject(new Error(`Unsupported format: ${format}`));
    }
  });
}

export async function loadModel(scene, modelInfo, onProgress, onError) {
  try {
    const model = await loadModelByFormat(modelInfo.path, modelInfo.format);

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.roughness = mat.roughness ?? 0.4;
              mat.metalness = mat.metalness ?? 0.3;
            });
          } else {
            child.material.roughness = child.material.roughness ?? 0.4;
            child.material.metalness = child.material.metalness ?? 0.3;
          }
        }
      }
    });

    centerAndScaleModel(model);
    scene.add(model);

    if (onProgress) onProgress(100);
    console.log(`✅ Model "${modelInfo.name}" loaded successfully`);
    return model;
  } catch (error) {
    console.error(error);
    if (onError) onError(error.message);
    throw error;
  }
}
