import * as THREE from "three";
import { CONFIG } from "/config.js";

// Убираем initScene, так как теперь он в main.js

export function setupLighting(scene) {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // Directional light (main)
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(2, 5, 3);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);

  // Fill light (cool)
  const fillLight = new THREE.PointLight(0x5577aa, 0.5);
  fillLight.position.set(-1, 1, -2);
  scene.add(fillLight);

  // Warm fill light
  const warmLight = new THREE.PointLight(0xffaa66, 0.4);
  warmLight.position.set(1, 1.5, 2);
  scene.add(warmLight);

  // Rim light
  const rimLight = new THREE.PointLight(0x88aaff, 0.3);
  rimLight.position.set(0, -1, 1);
  scene.add(rimLight);

  // Back light
  const backLight = new THREE.PointLight(0xff8866, 0.3);
  backLight.position.set(0, 1, -2);
  scene.add(backLight);
}

export function setupHelpers(scene) {
  // Grid helper
  const gridHelper = new THREE.GridHelper(
    10,
    20,
    CONFIG.COLORS.grid.main,
    CONFIG.COLORS.grid.secondary,
  );
  gridHelper.position.y = -0.8;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.4;
  scene.add(gridHelper);

  // Reference plane (semi-transparent)
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
}
