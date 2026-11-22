
import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

// Преобразование ошибки в понятное сообщение.
export function messageForError(error) {
  if (!(error instanceof ApiError)) {
    return "Не удалось выполнить операцию.";
  }

  if (error.kind === "timeout") {
    return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  }

  if (error.kind === "network") {
    return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  }

  if (error.kind === "invalid-response") {
    return "Сервер вернул ответ неожиданного формата.";
  }

  if (error.kind === "http" && error.status === 404) {
    return "Запись уже отсутствует на сервере. Обновите список.";
  }

  if (error.kind === "http") {
    return error.message || `Сервер вернул ошибку ${error.status}.`;
  }

  return "Не удалось выполнить операцию.";
}

// Создание контроллера приложения.
export function createAppController({
  api,
  view,
  validateDraft = validateTaskDraft,
} = {}) {
  const requiredApiMethods = [
    "loadInitialData",
    "getTasks",
    "createTask",
    "updateTask",
    "setTaskCompleted",
    "deleteTask",
    "resetDemoData",
  ];

  const requiredViewMethods = [
    "setListState",
    "setTasks",
    "setCategories",
    "setTotal",
    "setFormTask",
    "showFormErrors",
    "setMutationPending",
    "notify",
  ];

  if (
    !api
    || !requiredApiMethods.every((name) => typeof api[name] === "function")
  ) {
    throw new TypeError("Передан некорректный предметный API.");
  }

  if (
    !view
    || !requiredViewMethods.every((name) => typeof view[name] === "function")
  ) {
    throw new TypeError("Передано некорректное представление.");
  }

  if (typeof validateDraft !== "function") {
    throw new TypeError("validateDraft должна быть функцией.");
  }

  // Состояние приложения.
  let tasks = [];
  let categories = [];
  let filters = {};
  let editingId = null;
  let categoriesLoaded = false;

  // Управление запросами.
  let activeLoadController = null;
  let loadSequence = 0;

  function isAborted(error, controller) {
    return Boolean(
      controller?.signal.aborted
      || (error instanceof ApiError && error.kind === "aborted"),
    );
  }

  // Начальная загрузка или обновление списка.
  async function loadCurrentTasks() {
    if (activeLoadController) {
      activeLoadController.abort();
    }

    const controller = new AbortController();
    activeLoadController = controller;

    const currentSequence = ++loadSequence;

    view.setListState("loading");

    try {
      let result;

      // Если категории ещё не загружались, получаем их вместе с задачами.
      if (!categoriesLoaded) {
        result = await api.loadInitialData(filters, {
          signal: controller.signal,
        });

        if (currentSequence !== loadSequence || controller.signal.aborted) {
          return;
        }

        categories = result.categories;
        categoriesLoaded = true;

        view.setCategories(categories);
      } else {
        result = await api.getTasks(filters, {
          signal: controller.signal,
        });

        if (currentSequence !== loadSequence || controller.signal.aborted) {
          return;
        }
      }

      tasks = result.tasks;

      view.setTasks(tasks, categories);
      view.setTotal(result.meta?.total ?? tasks.length);

      if (tasks.length > 0) {
        view.setListState("ready");
      } else {
        view.setListState("empty");
      }
    } catch (error) {
      // Отменённый или устаревший запрос не должен менять интерфейс.
      if (
        currentSequence !== loadSequence
        || isAborted(error, controller)
      ) {
        return;
      }

      view.setListState("error", messageForError(error));
    } finally {
      if (currentSequence === loadSequence) {
        activeLoadController = null;
      }
    }
  }

  // Общая функция для операций изменения данных.
  async function performMutation(action, successMessage, afterSuccess) {
    view.setMutationPending(true);

    try {
      await action();

      if (afterSuccess) {
        afterSuccess();
      }

      view.notify(successMessage, "success");

      // После изменения снова получаем актуальный список от сервера.
      await loadCurrentTasks();
    } catch (error) {
      if (!(error instanceof ApiError && error.kind === "aborted")) {
        view.notify(messageForError(error), "error");
      }
    } finally {
      view.setMutationPending(false);
    }
  }

  // Начальный запуск.
  async function start(initialFilters = {}) {
    filters = { ...initialFilters };
    return loadCurrentTasks();
  }

  // Применение фильтров.
  async function applyFilters(nextFilters = {}) {
    filters = { ...nextFilters };
    return loadCurrentTasks();
  }

  // Повторная загрузка текущего списка.
  async function refresh() {
    return loadCurrentTasks();
  }

  // Создание новой задачи или сохранение изменений.
  async function submit(draft) {
    const result = validateDraft(draft, categories);

    view.showFormErrors(result.errors);

    if (!result.valid) {
      return;
    }

    const id = editingId;

    await performMutation(
      async () => {
        if (id !== null) {
          await api.updateTask(id, result.value);
        } else {
          await api.createTask(result.value);
        }
      },
      id !== null ? "Изменения сохранены." : "Задача создана.",
      () => {
        editingId = null;
        view.setFormTask(null);
        view.showFormErrors({});
      },
    );
  }

  // Перевод задачи в режим редактирования.
  function beginEdit(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return;
    }

    editingId = id;

    view.showFormErrors({});
    view.setFormTask(task);
  }

  // Отмена редактирования.
  function cancelEdit() {
    editingId = null;

    view.setFormTask(null);
    view.showFormErrors({});
  }

  // Переключение статуса задачи.
  async function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return;
    }

    await performMutation(
      () => api.setTaskCompleted(id, !task.completed),
      "Статус задачи изменён.",
    );
  }

  // Удаление задачи.
  async function deleteTask(id) {
    const taskExists = tasks.some((item) => item.id === id);

    if (!taskExists) {
      return;
    }

    await performMutation(
      () => api.deleteTask(id),
      "Задача удалена.",
      () => {
        if (editingId === id) {
          editingId = null;
          view.setFormTask(null);
        }
      },
    );
  }

  // Восстановление исходных данных.
  async function resetData() {
    await performMutation(
      () => api.resetDemoData(),
      "Исходные данные восстановлены.",
      () => {
        editingId = null;
        view.setFormTask(null);
        view.showFormErrors({});
      },
    );
  }

  // Завершение работы контроллера.
  function destroy() {
    loadSequence += 1;

    if (activeLoadController) {
      activeLoadController.abort();
      activeLoadController = null;
    }
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
