// uiController.js

const selectEl = document.querySelector("[data-model-select]");
const errorDiv = document.querySelector("[data-message]");

// ===== ИЗМЕНЁННАЯ ФУНКЦИЯ initUI =====
// Теперь она принимает третий аргумент — initialModelId
export function initUI(models, onSelectModel) {
  if (!models || models.length === 0) {
    showError(errorDiv, "Список моделей пуст. Проверьте models.json");
    return;
  }

  // Заполняем select
  selectEl.innerHTML = "";
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    selectEl.appendChild(option);
  });

  // Возвращаем DOM-элемент select, чтобы синхронизировать его в main.js
  return selectEl;
}
export function showLoading(loadingIndicator, show) {
  if (!loadingIndicator) return;

  if (show) {
    loadingIndicator.classList.add("_visible");
    selectEl.disabled = true;
  } else {
    loadingIndicator.classList.remove("_visible");
    selectEl.disabled = false;
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
