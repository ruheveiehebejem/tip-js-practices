import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
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

function isCategory(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    isPositiveSafeInteger(value.id) &&
    typeof value.name === "string" &&
    value.name.trim().length >= 1 &&
    value.name.trim().length <= 100
  );
}

function hasUniqueIds(items) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}

function normalizeFilters(filters = {}) {
  if (filters === null || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }
  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(key)) {
      throw new TypeError(`Неизвестный фильтр: ${key}.`);
    }
  }

  const query = {};
  if (Object.hasOwn(filters, "completed") && filters.completed !== undefined) {
    if (typeof filters.completed !== "boolean") {
      throw new TypeError("completed должен иметь логическое значение.");
    }
    query.completed = filters.completed;
  }
  if (Object.hasOwn(filters, "priority") && filters.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(filters.priority)) {
      throw new TypeError("Недопустимый приоритет.");
    }
    query.priority = filters.priority;
  }
  if (Object.hasOwn(filters, "categoryId") && filters.categoryId !== undefined) {
    if (!isPositiveSafeInteger(filters.categoryId)) {
      throw new TypeError("categoryId должен быть положительным безопасным целым числом.");
    }
    query.categoryId = filters.categoryId;
  }
  if (Object.hasOwn(filters, "q") && filters.q !== undefined) {
    if (typeof filters.q !== "string" || filters.q.trim().length > 100) {
      throw new TypeError("q должен быть строкой длиной до 100 символов.");
    }
    query.q = filters.q.trim();
  }
  return query;
}

function validateTaskCollection(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.data) ||
    !payload.meta ||
    typeof payload.meta !== "object" ||
    !Number.isSafeInteger(payload.meta.total) ||
    payload.meta.total !== payload.data.length ||
    !payload.data.every(isTask) ||
    !hasUniqueIds(payload.data)
  ) {
    throw invalidResponse("Ответ API со списком задач имеет неверную структуру.");
  }
  return { tasks: payload.data, meta: payload.meta };
}

function validateCategoryCollection(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.data) ||
    !payload.meta ||
    typeof payload.meta !== "object" ||
    !Number.isSafeInteger(payload.meta.total) ||
    payload.meta.total !== payload.data.length ||
    !payload.data.every(isCategory) ||
    !hasUniqueIds(payload.data)
  ) {
    throw invalidResponse("Ответ API со списком категорий имеет неверную структуру.");
  }
  return payload.data;
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Для createTaskApi требуется клиент с методом requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    return validateTaskCollection(payload);
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным безопасным целым числом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`);
    if (!payload || typeof payload !== "object" || !isTask(payload.data)) {
      throw invalidResponse("Ответ API с одной задачей имеет неверную структуру.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    return validateCategoryCollection(payload);
  }

  async function loadInitialData(filters = {}) {
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();
    const [taskResult, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return {
      tasks: taskResult.tasks,
      categories,
      meta: taskResult.meta,
    };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
