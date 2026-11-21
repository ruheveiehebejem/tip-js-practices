import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

const API_METHODS = [
  "loadInitialData", "getTasks", "createTask", "updateTask",
  "setTaskCompleted", "deleteTask", "resetDemoData",
];
const VIEW_METHODS = [
  "setListState", "setTasks", "setCategories", "setTotal",
  "setFormTask", "showFormErrors", "setMutationPending", "notify",
];

export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  if (!api || API_METHODS.some((name) => typeof api[name] !== "function")) {
    throw new TypeError("API не предоставляет все необходимые методы.");
  }
  if (!view || VIEW_METHODS.some((name) => typeof view[name] !== "function")) {
    throw new TypeError("Представление не предоставляет все необходимые методы.");
  }
  if (typeof validateDraft !== "function") throw new TypeError("validateDraft должен быть функцией.");

  let tasks = [];
  let categories = [];
  let filters = {};
  let editingId = null;
  let categoriesLoaded = false;
  let activeLoad = null;
  let loadNumber = 0;
  let destroyed = false;

  function setResult(result, includeCategories) {
    tasks = result.tasks;
    if (includeCategories) {
      categories = result.categories;
      categoriesLoaded = true;
      view.setCategories(categories);
    }
    view.setTasks(tasks, categories);
    view.setTotal(result.meta.total);
    view.setListState(tasks.length === 0 ? "empty" : "ready");
  }

  async function loadCurrent(filtersToUse = filters) {
    if (destroyed) return;
    filters = { ...filtersToUse };

    if (activeLoad) activeLoad.abort();
    const requestController = new AbortController();
    activeLoad = requestController;
    const currentLoadNumber = ++loadNumber;
    view.setListState("loading");

    try {
      if (!categoriesLoaded) {
        const initial = await api.loadInitialData(filters, { signal: requestController.signal });
        if (destroyed || currentLoadNumber !== loadNumber) return;
        setResult(initial, true);
      } else {
        const result = await api.getTasks(filters, { signal: requestController.signal });
        if (destroyed || currentLoadNumber !== loadNumber) return;
        setResult(result, false);
      }
    } catch (error) {
      if (destroyed || currentLoadNumber !== loadNumber) return;
      if (error instanceof ApiError && error.kind === "aborted") return;
      view.setListState("error", messageForError(error));
    } finally {
      if (currentLoadNumber === loadNumber) activeLoad = null;
    }
  }

  async function mutate(action, successMessage, afterSuccess) {
    if (destroyed) return false;
    view.setMutationPending(true);
    try {
      await action();
      if (afterSuccess) afterSuccess();
      view.notify(successMessage, "success");
      await loadCurrent(filters);
      return true;
    } catch (error) {
      view.notify(messageForError(error), "error");
      return false;
    } finally {
      view.setMutationPending(false);
    }
  }

  async function start(initialFilters = {}) {
    filters = { ...initialFilters };
    return loadCurrent(filters);
  }

  async function applyFilters(nextFilters = {}) {
    filters = { ...nextFilters };
    return loadCurrent(filters);
  }

  async function refresh() {
    return loadCurrent(filters);
  }

  async function submit(draft) {
    const validation = validateDraft(draft, categories);
    if (!validation.valid) {
      view.showFormErrors(validation.errors);
      return false;
    }

    const value = validation.value;
    const wasEditing = editingId !== null;
    const selectedId = editingId;
    return mutate(
      () => wasEditing
        ? api.updateTask(selectedId, value)
        : api.createTask(value),
      wasEditing ? "Изменения задачи сохранены." : "Задача создана.",
      () => {
        editingId = null;
        view.showFormErrors({});
        view.setFormTask(null);
      },
    );
  }

  function beginEdit(id) {
    const selected = tasks.find((task) => task.id === id);
    if (!selected) {
      view.notify("Задача не найдена в текущем списке.", "error");
      return false;
    }
    editingId = id;
    view.showFormErrors({});
    view.setFormTask(selected);
    return true;
  }

  function cancelEdit() {
    editingId = null;
    view.showFormErrors({});
    view.setFormTask(null);
  }

  async function toggleTask(id) {
    const selected = tasks.find((task) => task.id === id);
    if (!selected) {
      view.notify("Задача не найдена в текущем списке.", "error");
      return false;
    }
    return mutate(
      () => api.setTaskCompleted(id, !selected.completed),
      "Статус задачи изменён.",
    );
  }

  async function deleteTask(id) {
    if (!tasks.some((task) => task.id === id)) {
      view.notify("Задача не найдена в текущем списке.", "error");
      return false;
    }
    return mutate(
      () => api.deleteTask(id),
      "Задача удалена.",
      () => {
        if (editingId === id) {
          editingId = null;
          view.showFormErrors({});
          view.setFormTask(null);
        }
      },
    );
  }

  async function resetData() {
    return mutate(
      () => api.resetDemoData(),
      "Учебные данные восстановлены.",
      () => {
        editingId = null;
        view.showFormErrors({});
        view.setFormTask(null);
      },
    );
  }

  function destroy() {
    destroyed = true;
    loadNumber += 1;
    if (activeLoad) activeLoad.abort();
    activeLoad = null;
  }

  return {
    start,
    applyFilters,
    refresh,
    submit,
    beginEdit,
    cancelEdit,
    toggleTask,
    deleteTask,
    resetData,
    destroy,
  };
}
