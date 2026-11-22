
import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set([
  "completed",
  "priority",
  "categoryId",
  "q",
]);

function invalidResponse(message) {
  return new ApiError(message, {
    kind: "invalid-response",
  });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function checkId(id) {
  if (!isPositiveSafeInteger(id)) {
    throw new TypeError("id должен быть положительным целым числом.");
  }
}

function normalizeFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Фильтры должны быть объектом.");
  }

  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(key)) {
      throw new TypeError(`Неизвестный фильтр: ${key}.`);
    }
  }

  const query = {};

  if (filters.completed !== undefined) {
    if (typeof filters.completed !== "boolean") {
      throw new TypeError("completed должен быть boolean.");
    }

    query.completed = filters.completed;
  }

  if (filters.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(filters.priority)) {
      throw new TypeError("Недопустимый приоритет.");
    }

    query.priority = filters.priority;
  }

  if (filters.categoryId !== undefined) {
    if (!isPositiveSafeInteger(filters.categoryId)) {
      throw new TypeError("categoryId должен быть положительным числом.");
    }

    query.categoryId = filters.categoryId;
  }

  if (filters.q !== undefined) {
    if (typeof filters.q !== "string") {
      throw new TypeError("q должен быть строкой.");
    }

    const q = filters.q.trim();

    if (q.length > 100) {
      throw new TypeError("Поисковый запрос слишком длинный.");
    }

    if (q) {
      query.q = q;
    }
  }

  return query;
}

function checkTaskCollection(payload) {
  if (
    !payload
    || !Array.isArray(payload.data)
    || !payload.meta
    || !Number.isSafeInteger(payload.meta.total)
    || payload.meta.total !== payload.data.length
  ) {
    throw invalidResponse("Неверная структура списка задач.");
  }

  const ids = new Set();

  for (const task of payload.data) {
    if (!isTask(task)) {
      throw invalidResponse("Сервер вернул задачу неверного формата.");
    }

    if (ids.has(task.id)) {
      throw invalidResponse("Сервер вернул повторяющиеся id задач.");
    }

    ids.add(task.id);
  }

  return {
    tasks: payload.data,
    meta: payload.meta,
  };
}

function checkCategories(payload) {
  if (
    !payload
    || !Array.isArray(payload.data)
    || !payload.meta
    || !Number.isSafeInteger(payload.meta.total)
    || payload.meta.total !== payload.data.length
  ) {
    throw invalidResponse("Неверная структура списка категорий.");
  }

  const ids = new Set();

  for (const category of payload.data) {
    if (!isCategory(category)) {
      throw invalidResponse("Сервер вернул категорию неверного формата.");
    }

    if (ids.has(category.id)) {
      throw invalidResponse("Сервер вернул повторяющиеся id категорий.");
    }

    ids.add(category.id);
  }

  return payload.data;
}

function checkSingleTask(payload) {
  if (!payload || !isTask(payload.data)) {
    throw invalidResponse("Сервер вернул задачу неверного формата.");
  }

  return payload.data;
}

// Создание предметного API.
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Необходимо передать HTTP-клиент.");
  }

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);

    const payload = await client.requestJson("/tasks", {
      method: "GET",
      query,
      signal: options.signal,
    });

    return checkTaskCollection(payload);
  }

  async function getTaskById(id, options = {}) {
    checkId(id);

    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "GET",
      signal: options.signal,
    });

    return checkSingleTask(payload);
  }

  async function getCategories(options = {}) {
    const payload = await client.requestJson("/categories", {
      method: "GET",
      signal: options.signal,
    });

    return checkCategories(payload);
  }

  async function loadInitialData(filters = {}, options = {}) {
    const [taskResult, categories] = await Promise.all([
      getTasks(filters, options),
      getCategories(options),
    ]);

    return {
      tasks: taskResult.tasks,
      categories,
      meta: taskResult.meta,
    };
  }

  async function createTask(draft, options = {}) {
    const payload = await client.requestJson("/tasks", {
      method: "POST",
      body: draft,
      signal: options.signal,
    });

    return checkSingleTask(payload);
  }

  async function updateTask(id, changes, options = {}) {
    checkId(id);

    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH",
      body: changes,
      signal: options.signal,
    });

    return checkSingleTask(payload);
  }

  async function setTaskCompleted(id, completed, options = {}) {
    checkId(id);

    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH",
      body: { completed },
      signal: options.signal,
    });

    return checkSingleTask(payload);
  }

  async function deleteTask(id, options = {}) {
    checkId(id);

    const result = await client.requestJson(`/tasks/${id}`, {
      method: "DELETE",
      signal: options.signal,
    });

    if (result !== null) {
      throw invalidResponse("DELETE должен возвращать ответ 204 без тела.");
    }

    return null;
  }

  async function resetDemoData(options = {}) {
    const payload = await client.requestJson("/debug/reset", {
      method: "POST",
      signal: options.signal,
    });

    if (
      !payload
      || !payload.data
      || payload.data.reset !== true
      || !Number.isSafeInteger(payload.data.total)
    ) {
      throw invalidResponse("Сервер не подтвердил сброс данных.");
    }

    return payload.data;
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}
