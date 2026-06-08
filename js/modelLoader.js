import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { loadModel } from "/3d-library/js/modelLoader.js";
import { CONFIG } from "/3d-library/js/config.js";

const loaderGLTF = new GLTFLoader();
const loaderOBJ = new OBJLoader();
const loaderFBX = new FBXLoader();

function centerAndScaleModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = CONFIG.MODEL.targetHeight / maxDim;
  model.scale.set(scaleFactor, scaleFactor, scaleFactor);

  const newBox = new THREE.Box3().setFromObject(model);
  const deltaY = CONFIG.MODEL.groundY - newBox.min.y;
  model.position.y = deltaY;
  return model;
}

function loadModelByFormat(path, format) {
  return new Promise((resolve, reject) => {
    if (format === "glb" || format === "gltf") {
      loaderGLTF.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(new Error(`GLTF error: ${error.message}`)),
      );
    } else if (format === "obj") {
      loaderOBJ.load(
        path,
        (obj) => resolve(obj),
        undefined,
        (error) => reject(new Error(`OBJ error: ${error.message}`)),
      );
    } else if (format === "fbx") {
      loaderFBX.load(
        path,
        (fbx) => resolve(fbx),
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
