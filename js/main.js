import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { CONFIG } from "/3d-library/js/config.js";
import { setupLighting, setupHelpers } from "/3d-library/js/sceneManager.js";
import { loadModel } from "/3d-library/js/modelLoader.js";
import {
  initUI,
  showLoading,
  showError,
  updateCameraControls,
} from "/3d-library/js/uiController.js";

// Глобальные переменные
let scene, camera, renderer, controls;
let currentModel = null;
let modelsList = [];

async function fetchModelsList() {
  try {
    const response = await fetch(CONFIG.MODELS_LIST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    modelsList = data.models || [];
    return modelsList;
  } catch (error) {
    console.error("Failed to load models list:", error);
    showError(
      document.getElementById("errorMsg"),
      `Ошибка загрузки списка моделей: ${error.message}`,
    );
    return [];
  }
}

async function onSelectModel(modelInfo) {
  const loadingIndicator = document.querySelector("loading-indicator");
  const errorDiv = document.getElementById("errorMsg");

  showLoading(loadingIndicator, true);
  try {
    // Удаляем текущую модель
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
    }

    // Загружаем новую
    currentModel = await loadModel(
      scene,
      modelInfo,
      () => {},
      (errMsg) => showError(errorDiv, errMsg),
    );
    updateCameraControls(controls, camera);
  } finally {
    showLoading(loadingIndicator, false);
  }
}

function initScene() {
  // Получаем canvas из HTML
  const canvas = document.getElementById("modelCanvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return null;
  }

  // Создаём сцену
  scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.COLORS.background);
  scene.fog = new THREE.FogExp2(CONFIG.COLORS.fog, 0.008);

  // Камера
  camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.CAMERA.near,
    CONFIG.CAMERA.far,
  );
  camera.position.set(
    CONFIG.CAMERA.position.x,
    CONFIG.CAMERA.position.y,
    CONFIG.CAMERA.position.z,
  );

  // Рендерер с существующим canvas
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;

  // Элементы управления
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = CONFIG.CONTROLS.enableDamping;
  controls.dampingFactor = CONFIG.CONTROLS.dampingFactor;
  controls.rotateSpeed = CONFIG.CONTROLS.rotateSpeed;
  controls.zoomSpeed = CONFIG.CONTROLS.zoomSpeed;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.target.set(
    CONFIG.CONTROLS.target.x,
    CONFIG.CONTROLS.target.y,
    CONFIG.CONFIG?.target?.z || 0,
  );
  controls.update();

  return { scene, camera, renderer, controls };
}

async function init() {
  // Инициализируем сцену
  const sceneData = initScene();
  if (!sceneData) return;

  scene = sceneData.scene;
  camera = sceneData.camera;
  renderer = sceneData.renderer;
  controls = sceneData.controls;

  // Настраиваем освещение и вспомогательные элементы
  setupLighting(scene);
  setupHelpers(scene);

  // Загружаем список моделей
  const models = await fetchModelsList();
  if (models.length === 0) {
    // Демо-куб, если нет моделей
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa55,
      emissive: 0x442200,
    });
    const demoBox = new THREE.Mesh(geometry, material);
    demoBox.position.y = -0.3;
    demoBox.castShadow = true;
    scene.add(demoBox);
    currentModel = demoBox;
    return;
  }

  // Инициализируем UI
  initUI(models, onSelectModel);

  // Запускаем анимацию
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Обработчик изменения размера окна
window.addEventListener("resize", () => {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Запуск приложения
init();
