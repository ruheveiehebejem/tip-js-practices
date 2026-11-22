
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

function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function checkUniqueIds(items) {
  const ids = items.map((item) => item.id);
  return new Set(ids).size === ids.length;
}

function checkTasksPayload(payload) {
  if (
    !payload
    || !Array.isArray(payload.data)
    || !payload.data.every(isTask)
    || !checkUniqueIds(payload.data)
    || !payload.meta
    || !Number.isSafeInteger(payload.meta.total)
    || payload.meta.total !== payload.data.length
    || !payload.meta.filters
    || typeof payload.meta.filters !== "object"
    || Array.isArray(payload.meta.filters)
  ) {
    throw invalidResponse("Сервер вернул некорректный список задач.");
  }

  return {
    tasks: payload.data,
    meta: payload.meta,
  };
}

function checkCategoriesPayload(payload) {
  if (
    !payload
    || !Array.isArray(payload.data)
    || !payload.data.every(isCategory)
    || !checkUniqueIds(payload.data)
    || !payload.meta
    || !Number.isSafeInteger(payload.meta.total)
    || payload.meta.total !== payload.data.length
  ) {
    throw invalidResponse("Сервер вернул некорректный список категорий.");
  }

  return payload.data;
}

export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Необходимо передать API-клиент с методом requestJson.");
  }

  function normalizeFilters(filters = {}) {
    if (
      filters === null
      || typeof filters !== "object"
      || Array.isArray(filters)
    ) {
      throw new TypeError("Фильтры должны быть объектом.");
    }

    for (const key of Object.keys(filters)) {
      if (!ALLOWED_FILTERS.has(key)) {
        throw new TypeError(`Неизвестный фильтр: ${key}.`);
      }
    }

    const result = {};

    if (Object.hasOwn(filters, "completed")) {
      if (typeof filters.completed !== "boolean") {
        throw new TypeError("completed должен иметь значение true или false.");
      }
      result.completed = filters.completed;
    }

    if (Object.hasOwn(filters, "priority")) {
      if (!ALLOWED_PRIORITIES.has(filters.priority)) {
        throw new TypeError("Недопустимый приоритет.");
      }
      result.priority = filters.priority;
    }

    if (Object.hasOwn(filters, "categoryId")) {
      if (!isPositiveSafeInteger(filters.categoryId)) {
        throw new TypeError("categoryId должен быть положительным целым числом.");
      }
      result.categoryId = filters.categoryId;
    }

    if (Object.hasOwn(filters, "q")) {
      if (
        typeof filters.q !== "string"
        || filters.q.trim().length > 100
      ) {
        throw new TypeError("q должен быть строкой длиной до 100 символов.");
      }

      const q = filters.q.trim();
      if (q !== "") result.q = q;
    }

    return result;
  }

  async function getTasks(filters = {}) {
    const normalizedFilters = normalizeFilters(filters);

    const payload = await client.requestJson("/tasks", {
      query: normalizedFilters,
    });

    return checkTasksPayload(payload);
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным целым числом.");
    }

    const payload = await client.requestJson(`/tasks/${id}`);

    if (!payload || !isTask(payload.data)) {
      throw invalidResponse("Сервер вернул некорректную задачу.");
    }

    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    return checkCategoriesPayload(payload);
  }

  async function loadInitialData(filters = {}) {
    const [tasksResult, categories] = await Promise.all([
      getTasks(filters),
      getCategories(),
    ]);

    return {
      tasks: tasksResult.tasks,
      categories,
      meta: tasksResult.meta,
    };
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
  };
}
