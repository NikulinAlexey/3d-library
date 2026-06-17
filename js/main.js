import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CONFIG } from "/3d-library/js/config.js";
import { setupLighting, setupHelpers } from "/3d-library/js/sceneManager.js";
import { loadModel, disposeModel } from "/3d-library/js/modelLoader.js";
import {
  initUI,
  showLoading,
  showError,
  updateCameraControls,
} from "/3d-library/js/uiController.js";

/// Глобальные переменные
let scene, camera, renderer, controls;
let currentModel = null;
let modelsList = [];

// ===== РАБОТА С URL =====

// Получить ID модели из параметра 'model' в URL
function getModelIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("model");
}

// Обновить URL, добавив параметр 'model' с ID текущей модели
function updateURL(modelId) {
  const url = new URL(window.location);
  if (modelId) {
    url.searchParams.set("model", modelId);
  } else {
    url.searchParams.delete("model");
  }
  window.history.pushState({ modelId }, "", url);
}

// ===== ОСНОВНЫЕ ФУНКЦИИ =====

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
      document.querySelector("[data-message]"),
      `Ошибка загрузки списка моделей: ${error.message}`,
    );
    return [];
  }
}

async function onSelectModel(modelInfo) {
  const loadingIndicator = document.querySelector("[data-loader]");
  const errorDiv = document.querySelector("[data-message]");

  if (!modelInfo) return;

  showLoading(loadingIndicator, true);
  try {
    // Удаляем старую модель
    if (currentModel) {
      scene.remove(currentModel);
      disposeModel(currentModel);
      currentModel = null;
    }

    // Загружаем новую модель
    const newModel = await loadModel(scene, modelInfo);
    currentModel = newModel;

    // Обновляем URL после загрузки
    updateURL(modelInfo.id);

    // Синхронизируем выпадающий список
    const selectEl = document.querySelector("[data-model-select]");
    if (selectEl) {
      selectEl.value = modelInfo.id;
    }

    updateCameraControls(controls, camera);
  } catch (err) {
    console.error(err);
    showError(errorDiv, `Ошибка загрузки: ${err.message}`);
  } finally {
    showLoading(loadingIndicator, false);
  }
}

function initScene() {
  const canvas = document.querySelector("[data-canvas]");
  if (!canvas) {
    console.error("Canvas element not found!");
    return null;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.COLORS.background);
  scene.fog = new THREE.FogExp2(CONFIG.COLORS.fog, 0.008);

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

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;

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
    CONFIG.CONTROLS.target.z,
  );
  controls.update();

  return { scene, camera, renderer, controls };
}

let lastTime = 0;
const FPS_LIMIT = 30;

function animate(currentTime = 0) {
  requestAnimationFrame(animate);

  const delta = currentTime - lastTime;
  if (delta < 1000 / FPS_LIMIT) return;
  lastTime = currentTime;

  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// ===== ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ =====

async function init() {
  // 1. Настраиваем сцену
  const sceneData = initScene();
  if (!sceneData) return;

  scene = sceneData.scene;
  camera = sceneData.camera;
  renderer = sceneData.renderer;
  controls = sceneData.controls;

  setupLighting(scene);
  setupHelpers(scene);

  // 2. Загружаем список моделей
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
    demoBox.castShadow = false;
    scene.add(demoBox);
    currentModel = demoBox;
    animate();
    return;
  }

  // 3. Инициализируем UI (заполняем select)
  const selectEl = initUI(models);

  // 4. Определяем модель для первоначальной загрузки
  const modelIdFromURL = getModelIdFromURL();
  let initialModel = null;
  if (modelIdFromURL) {
    initialModel = models.find((m) => m.id === modelIdFromURL);
  }
  // Если модель по ID не найдена или ID не был передан, берём первую
  if (!initialModel) {
    initialModel = models[0];
  }

  // 5. Синхронизируем select с найденной моделью
  if (selectEl) {
    selectEl.value = initialModel.id;
  }

  // 6. Загружаем нужную модель (единственный вызов на старте)
  await onSelectModel(initialModel);

  // 7. Обработчик изменения select
  if (selectEl) {
    selectEl.onchange = (event) => {
      const selectedId = event.target.value;
      if (!selectedId) return;
      const selectedModel = models.find((m) => m.id === selectedId);
      if (selectedModel) onSelectModel(selectedModel);
    };
  }

  // 8. Обработчик события "назад" в браузере
  window.addEventListener("popstate", () => {
    const modelId = getModelIdFromURL();
    if (modelId) {
      const model = models.find((m) => m.id === modelId);
      if (model) {
        onSelectModel(model);
      }
    }
  });

  // 9. Запускаем цикл анимации
  animate();
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ ОКНА =====

window.addEventListener("resize", () => {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

window.addEventListener("beforeunload", () => {
  if (currentModel) {
    disposeModel(currentModel);
    scene.remove(currentModel);
    currentModel = null;
  }
});

// ===== ЗАПУСК =====

init();
