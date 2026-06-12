export const CONFIG = {
  MODELS_LIST_URL: "https://nikulinalexey.github.io/ar-models/models.json",

  CAMERA: {
    fov: 45,
    near: 0.1,
    far: 1000,
    position: { x: 3, y: 2, z: 5 },
  },

  CONTROLS: {
    enableDamping: true,
    dampingFactor: 0.05,
    rotateSpeed: 1.0,
    zoomSpeed: 1.2,
    panSpeed: 0.8,
    target: { x: 0, y: 0.5, z: 0 },
  },

  MODEL: {
    targetHeight: 1.2,
    groundY: -0.7,
  },

  COLORS: {
    background: 0x111122,
    fog: 0x111122,
    grid: { main: 0x88aaff, secondary: 0x335588 },
  },
};
