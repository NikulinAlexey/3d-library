// Импорты через import map (без указания node_modules)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

// ===== МАССИВ МОДЕЛЕЙ - ДОБАВЛЯЙТЕ МОДЕЛИ СЮДА =====
const modelsList = [
  {
    id: 1,
    name: "Мышка-v1",
    path: "./models/mouse-v1/model.glb",
    format: "glb",
    textures: null, // GLB/GLTF обычно содержат текстуры внутри
  },
  {
    id: 2,
    name: "Собака",
    path: "/models/dog-v1/model.fbx",
    format: "fbx",
    textures: {
      diffuse: "/models/dog-v1/T_GermanShepherd_B.png", // Диффузная (цвет)
      normal: "/models/dog-v1/T_GermanShepherd_N.png", // Нормаль (рельеф)
      roughness: "/models/dog-v1/T_GermanShepherd_R.png", // Шероховатость
      // emissive: "/models/dog-v1/emissive.png",        // Свечение (опционально)
      // ao: "/models/dog-v1/ao.png",                    // Ambient occlusion (опционально)
      // metallic: "/models/dog-v1/metallic.png"         // Металличность (опционально)
    },
  },
  // ДОБАВЛЯЙТЕ НОВЫЕ МОДЕЛИ ПО ШАБЛОНУ:
  // {
  //     id: 4,
  //     name: "Название на русском",
  //     path: "/models/имя_файла.glb",
  //     format: "glb"
  // },
];

const DEFAULT_MODEL_ID = 2; // ID модели, которая загрузится первой

// ===== ИНИЦИАЛИЗАЦИЯ =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);
scene.fog = new THREE.FogExp2(0x111122, 0.008);

// КАМЕРА: фиксированная позиция
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

const canvas = document.getElementById("modelCanvas");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// Отключаем управление камерой
const controls = new OrbitControls(camera, canvas);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = false;
controls.enableDamping = false;

// ОСВЕЩЕНИЕ (улучшенное для текстур)
const ambientLight = new THREE.AmbientLight(0x606080, 0.8);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(2, 5, 3);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x5577aa, 0.6);
fillLight.position.set(-1, 1, -2);
scene.add(fillLight);

const warmLight = new THREE.PointLight(0xffaa66, 0.5);
warmLight.position.set(1, 1.5, 2);
scene.add(warmLight);

const rimLight = new THREE.PointLight(0x88aaff, 0.4);
rimLight.position.set(0, -1, 1);
scene.add(rimLight);

const backLight = new THREE.PointLight(0xff8866, 0.4);
backLight.position.set(0, 1, -2);
scene.add(backLight);

const fillLight2 = new THREE.PointLight(0x88aaff, 0.3);
fillLight2.position.set(0, -1, -2);
scene.add(fillLight2);

// ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ
const gridHelper = new THREE.GridHelper(10, 20, 0x88aaff, 0x335588);
gridHelper.position.y = -0.8;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.4;
scene.add(gridHelper);

const planeMat = new THREE.MeshStandardMaterial({
  color: 0x2266aa,
  roughness: 0.5,
  metalness: 0.7,
  transparent: true,
  opacity: 0.2,
});
const refPlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), planeMat);
refPlane.rotation.x = -Math.PI / 2;
refPlane.position.y = -0.85;
refPlane.receiveShadow = true;
scene.add(refPlane);

// ПЕРЕМЕННЫЕ ДЛЯ ВРАЩЕНИЯ МОДЕЛИ
let currentModel = null;
let currentModelInfo = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let modelRotationX = 0;
let modelRotationY = 0;

// Загрузчики
const loaderGLTF = new GLTFLoader();
const loaderOBJ = new OBJLoader();
const loaderFBX = new FBXLoader();
const textureLoader = new THREE.TextureLoader();

const selectEl = document.getElementById("modelSelect");
const errorDiv = document.getElementById("errorMsg");

// ИНДИКАТОР ЗАГРУЗКИ
const loadingDiv = document.createElement("div");
loadingDiv.className = "loading-indicator";
loadingDiv.textContent = "⏳ Загрузка модели...";
loadingDiv.style.display = "none";
document.body.appendChild(loadingDiv);

// ===== ФУНКЦИИ ЗАГРУЗКИ ТЕКСТУР ДЛЯ РАЗНЫХ ФОРМАТОВ =====

// Загрузка текстур для FBX модели
async function applyTexturesToFBX(model, textures) {
  if (!textures) return;

  console.log("🎨 Загрузка текстур для FBX модели...");
  const loadedTextures = {};

  // Загружаем все указанные текстуры
  if (textures.diffuse) {
    loadedTextures.map = textureLoader.load(textures.diffuse);
    console.log("  ✅ Diffuse текстура загружена");
  }
  if (textures.normal) {
    loadedTextures.normalMap = textureLoader.load(textures.normal);
    console.log("  ✅ Normal текстура загружена");
  }
  if (textures.roughness) {
    loadedTextures.roughnessMap = textureLoader.load(textures.roughness);
    loadedTextures.roughness = 0.5;
    console.log("  ✅ Roughness текстура загружена");
  }
  if (textures.metallic) {
    loadedTextures.metalnessMap = textureLoader.load(textures.metallic);
    loadedTextures.metalness = 0.5;
    console.log("  ✅ Metallic текстура загружена");
  }
  if (textures.emissive) {
    loadedTextures.emissiveMap = textureLoader.load(textures.emissive);
    loadedTextures.emissive = new THREE.Color(0xffffff);
    console.log("  ✅ Emissive текстура загружена");
  }
  if (textures.ao) {
    loadedTextures.aoMap = textureLoader.load(textures.ao);
    console.log("  ✅ AO текстура загружена");
  }

  // Применяем текстуры ко всем мешам
  let materialCount = 0;
  model.traverse((child) => {
    if (child.isMesh) {
      materialCount++;
      child.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.3,
        ...loadedTextures,
      });
      child.material.needsUpdate = true;
    }
  });

  console.log(`✅ Текстуры применены к ${materialCount} мешам`);
}

// Загрузка текстур для OBJ модели
async function applyTexturesToOBJ(model, textures) {
  if (!textures) return;

  console.log("🎨 Загрузка текстур для OBJ модели...");
  const loadedTextures = {};

  if (textures.diffuse) {
    loadedTextures.map = textureLoader.load(textures.diffuse);
    console.log("  ✅ Diffuse текстура загружена");
  }
  if (textures.normal) {
    loadedTextures.normalMap = textureLoader.load(textures.normal);
    console.log("  ✅ Normal текстура загружена");
  }

  model.traverse((child) => {
    if (child.isMesh) {
      if (child.material) {
        Object.assign(child.material, loadedTextures);
        child.material.needsUpdate = true;
      } else {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.4,
          metalness: 0.3,
          ...loadedTextures,
        });
      }
    }
  });

  console.log("✅ Текстуры применены к OBJ модели");
}

// GLTF/GLB модели обычно уже содержат текстуры, но можно переопределить
async function applyTexturesToGLTF(model, textures) {
  if (!textures) {
    console.log("📦 GLTF/GLB модель использует встроенные текстуры");
    return;
  }

  console.log("🎨 Переопределение текстур для GLTF модели...");
  const loadedTextures = {};

  if (textures.diffuse)
    loadedTextures.map = textureLoader.load(textures.diffuse);
  if (textures.normal)
    loadedTextures.normalMap = textureLoader.load(textures.normal);

  model.traverse((child) => {
    if (child.isMesh && child.material) {
      Object.assign(child.material, loadedTextures);
      child.material.needsUpdate = true;
    }
  });

  console.log("✅ Текстуры переопределены");
}

// ===== УНИВЕРСАЛЬНАЯ ЗАГРУЗКА МОДЕЛИ =====
async function loadModelByPath(filePath, format, textures = null) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Загрузка: ${filePath} (${format})`);

    if (format === "glb" || format === "gltf") {
      loaderGLTF.load(
        filePath,
        async (gltf) => {
          const model = gltf.scene;
          if (textures) {
            await applyTexturesToGLTF(model, textures);
          }
          resolve(model);
        },
        (progress) => {
          const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
          console.log(`  Загрузка: ${percent}%`);
        },
        (error) => reject(new Error(`GLTF ошибка: ${error.message}`)),
      );
    } else if (format === "obj") {
      loaderOBJ.load(
        filePath,
        async (objGroup) => {
          if (textures) {
            await applyTexturesToOBJ(objGroup, textures);
          }
          resolve(objGroup);
        },
        (progress) => {},
        (error) => reject(new Error(`OBJ ошибка: ${error.message}`)),
      );
    } else if (format === "fbx") {
      loaderFBX.load(
        filePath,
        async (fbxGroup) => {
          if (textures) {
            await applyTexturesToFBX(fbxGroup, textures);
          }
          resolve(fbxGroup);
        },
        (progress) => {},
        (error) => reject(new Error(`FBX ошибка: ${error.message}`)),
      );
    } else {
      reject(
        new Error(
          `❌ Неподдерживаемый формат: ${format}. Поддерживаются: glb, gltf, obj, fbx`,
        ),
      );
    }
  });
}

// ===== ФУНКЦИИ ДЛЯ ВРАЩЕНИЯ МОДЕЛИ =====
function onMouseDown(event) {
  if (!currentModel) return;
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
  canvas.style.cursor = "grabbing";
}

function onMouseMove(event) {
  if (!isDragging || !currentModel) return;

  const deltaX = event.clientX - previousMousePosition.x;
  const deltaY = event.clientY - previousMousePosition.y;

  modelRotationY += deltaX * 0.01;
  modelRotationX += deltaY * 0.01;

  modelRotationX = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, modelRotationX),
  );

  currentModel.rotation.x = modelRotationX;
  currentModel.rotation.y = modelRotationY;

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
}

function onMouseUp() {
  isDragging = false;
  canvas.style.cursor = "grab";
}

function resetModelRotation() {
  modelRotationX = 0;
  modelRotationY = 0;
  if (currentModel) {
    currentModel.rotation.x = 0;
    currentModel.rotation.y = 0;
  }
}

// Добавляем обработчики
canvas.addEventListener("mousedown", onMouseDown);
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mouseup", onMouseUp);
canvas.style.cursor = "grab";

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====
function showError(message) {
  errorDiv.textContent = `⚠️ ${message}`;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.opacity = "0";
    setTimeout(() => {
      errorDiv.style.display = "none";
      errorDiv.style.opacity = "1";
    }, 500);
  }, 4000);
  console.error(message);
}

function showLoading(show) {
  loadingDiv.style.display = show ? "block" : "none";
}

function removeCurrentModel() {
  if (currentModel) {
    scene.remove(currentModel);
    // Очищаем ресурсы
    currentModel.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    currentModel = null;
  }
  modelRotationX = 0;
  modelRotationY = 0;
}

function centerAndScaleModel(model, targetHeight = 1.2) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = targetHeight / maxDim;
  model.scale.set(scaleFactor, scaleFactor, scaleFactor);

  const newBox = new THREE.Box3().setFromObject(model);
  const newMinY = newBox.min.y;
  const targetBottomY = -0.7;
  const deltaY = targetBottomY - newMinY;
  model.position.y = deltaY;

  return model;
}

async function switchToModelById(modelId) {
  const modelInfo = modelsList.find((m) => m.id === modelId);
  if (!modelInfo) {
    showError(`Модель с ID ${modelId} не найдена!`);
    return;
  }

  if (currentModelInfo?.path === modelInfo.path && currentModel !== null) {
    console.log("Модель уже загружена");
    return;
  }

  showLoading(true);

  try {
    removeCurrentModel();
    const loadedModel = await loadModelByPath(
      modelInfo.path,
      modelInfo.format,
      modelInfo.textures,
    );

    // Настройка материалов и теней
    loadedModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (!child.material.map) {
            // Если нет текстур, делаем материал чуть светлее
            child.material.color = new THREE.Color(0xcccccc);
          }
        }
      }
    });

    centerAndScaleModel(loadedModel, 1.3);
    scene.add(loadedModel);
    currentModel = loadedModel;
    currentModelInfo = modelInfo;

    resetModelRotation();

    console.log(`✅ Модель "${modelInfo.name}" успешно загружена`);
    console.log(`   Формат: ${modelInfo.format.toUpperCase()}`);
    console.log(
      `   Текстуры: ${modelInfo.textures ? "загружены отдельно" : "встроенные"}`,
    );
  } catch (err) {
    console.error(err);
    showError(`Ошибка загрузки "${modelInfo.name}": ${err.message}`);
    currentModelInfo = null;
  } finally {
    showLoading(false);
  }
}

function populateSelect() {
  if (modelsList.length === 0) {
    selectEl.innerHTML = `
            <option value="" disabled>⚠️ Нет добавленных моделей</option>
            <option value="" disabled>──────────────</option>
            <option value="" disabled>Добавьте модели в массив</option>
            <option value="" disabled>в файле main.js</option>
        `;
    showError("В массиве modelsList нет моделей! Добавьте их в main.js");
    return;
  }

  selectEl.innerHTML = "";
  modelsList.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = `${model.name} (${model.format.toUpperCase()})`;
    option.title = `Путь: ${model.path}\nФормат: ${model.format}\nТекстуры: ${model.textures ? "отдельные файлы" : "встроенные"}`;
    selectEl.appendChild(option);
  });

  selectEl.onchange = (event) => {
    const selectedId = parseInt(event.target.value);
    if (selectedId) switchToModelById(selectedId);
  };

  let startModelId = DEFAULT_MODEL_ID;
  const modelExists = modelsList.some((m) => m.id === startModelId);

  if (!modelExists && modelsList.length > 0) {
    startModelId = modelsList[0].id;
    console.warn(
      `Модель с ID ${DEFAULT_MODEL_ID} не найдена, загружаем первую из списка`,
    );
  }

  if (modelsList.length > 0) {
    selectEl.value = startModelId;
    switchToModelById(startModelId);
  }
}

function addResetButton() {
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "🔄 Сбросить вращение";
  resetBtn.style.position = "fixed";
  resetBtn.style.bottom = "20px";
  resetBtn.style.right = "20px";
  resetBtn.style.zIndex = "100";
  resetBtn.style.padding = "8px 16px";
  resetBtn.style.background = "rgba(30,30,40,0.85)";
  resetBtn.style.backdropFilter = "blur(10px)";
  resetBtn.style.border = "1px solid rgba(255,255,255,0.2)";
  resetBtn.style.borderRadius = "30px";
  resetBtn.style.color = "white";
  resetBtn.style.cursor = "pointer";
  resetBtn.style.fontSize = "12px";
  resetBtn.style.fontFamily = "monospace";
  resetBtn.onclick = resetModelRotation;
  document.body.appendChild(resetBtn);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ЗАПУСК
populateSelect();
addResetButton();
animate();

console.log("🎮 3D Viewer запущен");
console.log(`📊 Загружено моделей: ${modelsList.length}`);
console.log("📁 Поддерживаемые форматы: GLB, GLTF, OBJ, FBX");
console.log("🎨 Текстуры: автоматическая загрузка для FBX и OBJ");
console.log("🖱️ Управление: зажмите ЛКМ и двигайте мышь для вращения модели");