const loadingIndicator = document.querySelector("loading-indicator");

export function initUI(models, onSelectModel) {
  const selectEl = document.getElementById("modelSelect");
  const errorDiv = document.getElementById("errorMsg");

  if (!models || models.length === 0) {
    showError(errorDiv, "Список моделей пуст. Проверьте models.json");
    return;
  }

  // Populate select
  selectEl.innerHTML = "";
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    selectEl.appendChild(option);
  });

  // Select first model by default
  selectEl.value = models[0].id;
  onSelectModel(models[0]);

  // Event handler
  selectEl.onchange = (event) => {
    const selectedId = event.target.value;
    if (!selectedId) return;
    const selectedModel = models.find((m) => m.id === selectedId);
    if (selectedModel) onSelectModel(selectedModel);
  };
}

export function showLoading(loadingIndicator, show) {
  if (!loadingIndicator) return;

  if (show) {
    loadingIndicator.classList.add("_visible");
    loadingIndicator.style.display = "block";
  } else {
    loadingIndicator.classList.remove("_visible");
    loadingIndicator.style.display = "none";
  }
}

export function showError(errorDiv, message) {
  if (!errorDiv) return;
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

export function updateCameraControls(controls, camera) {
  controls.target.set(0, 0.2, 0);
  camera.position.set(3, 1.8, 4.5);
  controls.update();
}
