import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    isPositiveSafeInteger(value.id) &&
    typeof value.title === "string" &&
    value.title.trim().length >= 1 &&
    value.title.trim().length <= 100 &&
    typeof value.completed === "boolean" &&
    ALLOWED_PRIORITIES.has(value.priority) &&
    isPositiveSafeInteger(value.categoryId)
  );
}

export function isCategory(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    isPositiveSafeInteger(value.id) &&
    typeof value.name === "string" &&
    value.name.trim().length >= 1 &&
    value.name.trim().length <= 100
  );
}

function uniqueIds(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
  }
  return true;
}

function normalizeFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Фильтры должны быть объектом.");
  }
  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(key)) throw new TypeError(`Неизвестный фильтр: ${key}.`);
  }

  const query = {};
  if (Object.hasOwn(filters, "completed") && filters.completed !== undefined) {
    if (typeof filters.completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    query.completed = filters.completed;
  }
  if (Object.hasOwn(filters, "priority") && filters.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(filters.priority)) throw new TypeError("Недопустимый priority.");
    query.priority = filters.priority;
  }
  if (Object.hasOwn(filters, "categoryId") && filters.categoryId !== undefined) {
    if (!isPositiveSafeInteger(filters.categoryId)) throw new TypeError("categoryId должен быть положительным целым числом.");
    query.categoryId = filters.categoryId;
  }
  if (Object.hasOwn(filters, "q") && filters.q !== undefined) {
    if (typeof filters.q !== "string" || filters.q.trim().length > 100) throw new TypeError("q должен быть строкой длиной до 100 символов.");
    query.q = filters.q.trim();
  }
  return query;
}

function signalOptions(options = {}) {
  return options?.signal ? { signal: options.signal } : undefined;
}

function validateTaskPayload(payload) {
  if (!payload || typeof payload !== "object" || !isTask(payload.data)) {
    throw invalidResponse("Ответ API с задачей имеет неверную структуру.");
  }
  return payload.data;
}

function validateTaskListPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.data) ||
    !payload.meta ||
    !Number.isSafeInteger(payload.meta.total) ||
    payload.meta.total !== payload.data.length ||
    !payload.data.every(isTask) ||
    !uniqueIds(payload.data)
  ) {
    throw invalidResponse("Ответ API со списком задач имеет неверную структуру.");
  }
  return { tasks: payload.data, meta: payload.meta };
}

function validateCategoryPayload(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.data) ||
    !payload.meta ||
    !Number.isSafeInteger(payload.meta.total) ||
    payload.meta.total !== payload.data.length ||
    !payload.data.every(isCategory) ||
    !uniqueIds(payload.data)
  ) {
    throw invalidResponse("Ответ API со списком категорий имеет неверную структуру.");
  }
  return payload.data;
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Для предметного API требуется requestJson.");
  }

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", {
      query,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return validateTaskListPayload(payload);
  }

  async function getTaskById(id, options = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным безопасным целым числом.");
    const payload = await client.requestJson(`/tasks/${id}`, signalOptions(options));
    return validateTaskPayload(payload);
  }

  async function getCategories(options = {}) {
    const payload = await client.requestJson("/categories", signalOptions(options));
    return validateCategoryPayload(payload);
  }

  async function loadInitialData(filters = {}, options = {}) {
    const tasksPromise = getTasks(filters, options);
    const categoriesPromise = getCategories(options);
    const [taskResult, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks: taskResult.tasks, categories, meta: taskResult.meta };
  }

  async function createTask(draft, options = {}) {
    const request = { method: "POST", body: draft };
    if (options?.signal) request.signal = options.signal;
    const payload = await client.requestJson("/tasks", request);
    return validateTaskPayload(payload);
  }

  async function updateTask(id, changes, options = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным безопасным целым числом.");
    const request = { method: "PATCH", body: changes };
    if (options?.signal) request.signal = options.signal;
    const payload = await client.requestJson(`/tasks/${id}`, request);
    return validateTaskPayload(payload);
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (!isPositiveSafeInteger(id) || typeof completed !== "boolean") {
      throw new TypeError("Для изменения статуса нужен корректный id и boolean.");
    }
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, options = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("id должен быть положительным безопасным целым числом.");
    const request = { method: "DELETE" };
    if (options?.signal) request.signal = options.signal;
    const result = await client.requestJson(`/tasks/${id}`, request);
    if (result !== null) throw invalidResponse("DELETE должен завершаться ответом 204 без тела.");
    return null;
  }

  async function resetDemoData(options = {}) {
    const request = { method: "POST" };
    if (options?.signal) request.signal = options.signal;
    const payload = await client.requestJson("/debug/reset", request);
    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.data ||
      payload.data.reset !== true ||
      !Number.isSafeInteger(payload.data.total) ||
      payload.data.total < 0
    ) {
      throw invalidResponse("API вернул неверное подтверждение сброса данных.");
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
