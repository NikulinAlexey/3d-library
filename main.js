// Импорты через import map (без указания node_modules)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// --- Конфигурация ---
const MODELS_MANIFEST_URL = 'https://nikulinalexey.github.io/ar-models/models.json';

// --- Инициализация сцены, камеры, рендерера (как у вас и было) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);
scene.fog = new THREE.FogExp2(0x111122, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement); // Добавляем canvas на страницу

// --- Элементы управления ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.enableZoom = true;
controls.enablePan = true;
controls.target.set(0, 0.5, 0);
controls.update();

// --- Освещение (оставляем вашу качественную схему) ---
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(2, 5, 3);
mainLight.castShadow = true;
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

// --- Вспомогательные элементы (пол, сетка) ---
const gridHelper = new THREE.GridHelper(10, 20, 0x88aaff, 0x335588);
gridHelper.position.y = -0.8;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.4;
scene.add(gridHelper);
const planeMat = new THREE.MeshStandardMaterial({ color: 0x2266aa, roughness: 0.5, metalness: 0.7, transparent: true, opacity: 0.2 });
const refPlane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), planeMat);
refPlane.rotation.x = -Math.PI / 2;
refPlane.position.y = -0.85;
refPlane.receiveShadow = true;
scene.add(refPlane);

// --- Глобальные переменные ---
let currentModel = null;
const loader = new GLTFLoader();
const selectEl = document.getElementById('modelSelect'); // Ваш <select> элемент
const errorDiv = document.getElementById('errorMsg');

// --- Функции ---
function showError(message) {
    errorDiv.textContent = `⚠️ ${message}`;
    errorDiv.style.display = "block";
    setTimeout(() => {
        errorDiv.style.opacity = "0";
        setTimeout(() => { errorDiv.style.display = "none"; errorDiv.style.opacity = "1"; }, 500);
    }, 4000);
    console.error(message);
}

function showLoading(show) {
    // Простая индикация загрузки (можно стилизовать)
    const loadingDiv = document.getElementById('loadingIndicator') || (() => {
        const div = document.createElement('div');
        div.id = 'loadingIndicator';
        div.style.position = 'absolute';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.background = 'rgba(0,0,0,0.7)';
        div.style.color = 'white';
        div.style.padding = '8px 15px';
        div.style.borderRadius = '20px';
        div.style.fontFamily = 'monospace';
        div.style.display = 'none';
        document.body.appendChild(div);
        return div;
    })();
    loadingDiv.style.display = show ? 'block' : 'none';
}

function removeCurrentModel() {
    if (currentModel) {
        scene.remove(currentModel);
        // Очистка ресурсов для предотвращения утечек памяти
        currentModel.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
        currentModel = null;
    }
}

function centerAndScaleModel(model, targetHeight = 1.2) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scaleFactor = targetHeight / Math.max(size.x, size.y, size.z);
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    const newBox = new THREE.Box3().setFromObject(model);
    const deltaY = -0.7 - newBox.min.y; // Ставим модель на плоскость
    model.position.y = deltaY;
    return model;
}

async function loadModel(modelInfo) {
    removeCurrentModel();
    showLoading(true);
    try {
        const gltf = await loader.loadAsync(modelInfo.path);
        const model = gltf.scene;
        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        centerAndScaleModel(model);
        scene.add(model);
        currentModel = model;
        controls.target.set(0, 0.2, 0);
        camera.position.set(3, 1.8, 4.5);
        controls.update();
        console.log(`✅ Модель "${modelInfo.name}" загружена`);
    } catch (err) {
        showError(`Ошибка загрузки "${modelInfo.name}": ${err.message}`);
        console.error(err);
    } finally {
        showLoading(false);
    }
}

async function init() {
    showLoading(true);
    try {
        const response = await fetch(MODELS_MANIFEST_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const models = data.models;

        if (!models || models.length === 0) {
            showError("Список моделей пуст. Добавьте модели в models.json");
            return;
        }

        // Заполняем select
        selectEl.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            selectEl.appendChild(option);
        });

        // Загружаем первую модель
        selectEl.value = models[0].id;
        await loadModel(models[0]);

        // Обработчик смены модели
        selectEl.onchange = async (event) => {
            const selectedId = event.target.value;
            const selectedModel = models.find(m => m.id === selectedId);
            if (selectedModel) await loadModel(selectedModel);
        };

    } catch (error) {
        showError(`Не удалось загрузить список моделей: ${error.message}. Проверьте models.json.`);
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// --- Запуск анимации и инициализация ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
animate();