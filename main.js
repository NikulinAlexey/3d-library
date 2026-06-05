// import * as THREE from "three";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
// import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

// Импорты через import map (без указания node_modules)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// ===== МАССИВ МОДЕЛЕЙ - ДОБАВЛЯЙТЕ МОДЕЛИ СЮДА =====
const modelsList = [
  {
    id: 1,
    name: "Мышка-v1",
    path: "./models/mouse-v1/model.glb",
    format: "glb",
  },
  // ДОБАВЛЯЙТЕ НОВЫЕ МОДЕЛИ ПО ШАБЛОНУ:
  // {
  //     id: 4,
  //     name: "Название на русском",
  //     path: "/models/имя_файла.glb",
  //     format: "glb"
  // },
];

const DEFAULT_MODEL_ID = 1;

// ===== ИНИЦИАЛИЗАЦИЯ =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);
scene.fog = new THREE.FogExp2(0x111122, 0.008);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(3, 2, 5);

const canvas = document.getElementById("modelCanvas");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
controls.enableZoom = true;
controls.enablePan = true;
controls.panSpeed = 1.0;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  RIGHT: THREE.MOUSE.PAN,
};
controls.target.set(0, 0.5, 0);

// ОСВЕЩЕНИЕ
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(2, 5, 3);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x5577aa, 0.5);
fillLight.position.set(-1, 1, -2);
scene.add(fillLight);

const warmLight = new THREE.PointLight(0xffaa66, 0.4);
warmLight.position.set(1, 1.5, 2);
scene.add(warmLight);

const rimLight = new THREE.PointLight(0x88aaff, 0.3);
rimLight.position.set(0, -1, 1);
scene.add(rimLight);

const backLight = new THREE.PointLight(0xff8866, 0.3);
backLight.position.set(0, 1, -2);
scene.add(backLight);

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

// ПЕРЕМЕННЫЕ
let currentModel = null;
let currentModelPath = "";
const loaderGLTF = new GLTFLoader();
const loaderOBJ = new OBJLoader();
const loaderFBX = new FBXLoader();

const selectEl = document.getElementById("modelSelect");
const errorDiv = document.getElementById("errorMsg");

// ИНДИКАТОР ЗАГРУЗКИ
const loadingDiv = document.createElement("div");
loadingDiv.className = "loading-indicator";
loadingDiv.textContent = "⏳ Загрузка модели...";
loadingDiv.style.display = "none";
document.body.appendChild(loadingDiv);

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
    if (currentModel.isMesh) {
      currentModel.geometry.dispose();
      if (currentModel.material) currentModel.material.dispose();
    } else if (currentModel.isGroup) {
      currentModel.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material))
              child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
    }
    currentModel = null;
  }
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

async function loadModelByPath(filePath, format) {
  return new Promise((resolve, reject) => {
    console.log(`Загрузка: ${filePath} (${format})`);

    if (format === "glb" || format === "gltf") {
      loaderGLTF.load(
        filePath,
        (gltf) => resolve(gltf.scene),
        (progress) => {},
        (error) => reject(new Error(`GLTF ошибка: ${error.message}`)),
      );
    } else if (format === "obj") {
      loaderOBJ.load(
        filePath,
        (objGroup) => resolve(objGroup),
        (progress) => {},
        (error) => reject(new Error(`OBJ ошибка: ${error.message}`)),
      );
    } else if (format === "fbx") {
      loaderFBX.load(
        filePath,
        (fbxGroup) => resolve(fbxGroup),
        (progress) => {},
        (error) => reject(new Error(`FBX ошибка: ${error.message}`)),
      );
    } else {
      reject(new Error(`Неподдерживаемый формат: ${format}`));
    }
  });
}

async function switchToModelById(modelId) {
  const model = modelsList.find((m) => m.id === modelId);
  if (!model) {
    showError(`Модель с ID ${modelId} не найдена!`);
    return;
  }

  if (currentModelPath === model.path && currentModel !== null) {
    console.log("Модель уже загружена");
    return;
  }

  showLoading(true);

  try {
    removeCurrentModel();
    const loadedModel = await loadModelByPath(model.path, model.format);

    loadedModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.roughness = mat.roughness !== undefined ? mat.roughness : 0.4;
              mat.metalness = mat.metalness !== undefined ? mat.metalness : 0.3;
            });
          } else {
            child.material.roughness =
              child.material.roughness !== undefined
                ? child.material.roughness
                : 0.4;
            child.material.metalness =
              child.material.metalness !== undefined
                ? child.material.metalness
                : 0.3;
          }
        }
      }
    });

    centerAndScaleModel(loadedModel, 1.3);
    scene.add(loadedModel);
    currentModel = loadedModel;
    currentModelPath = model.path;

    controls.target.set(0, 0.2, 0);
    camera.position.set(3, 1.8, 4.5);
    controls.update();

    console.log(`✅ Модель "${model.name}" загружена`);
  } catch (err) {
    console.error(err);
    showError(`Ошибка загрузки "${model.name}": ${err.message}`);
    currentModelPath = "";
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

    const demoGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const demoMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa55,
      emissive: 0x442200,
    });
    const demoBox = new THREE.Mesh(demoGeometry, demoMaterial);
    demoBox.position.y = -0.3;
    demoBox.castShadow = true;
    scene.add(demoBox);
    currentModel = demoBox;
    return;
  }

  selectEl.innerHTML = "";
  modelsList.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    option.title = `Путь: ${model.path}\nФормат: ${model.format}`;
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

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ЗАПУСК
populateSelect();
animate();

console.log(`3D Viewer запущен. Загружено моделей: ${modelsList.length}`);
console.log("Поддерживаемые форматы: glTF, GLB, OBJ, FBX");
