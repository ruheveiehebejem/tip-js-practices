import { ApiError } from "./errors.js";

const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

function invalidQuery(message) {
  return new ApiError(400, "INVALID_QUERY", message);
}

export function parsePositiveId(raw) {
  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) {
    return null;
  }

  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseFilters(searchParams) {
  if (!searchParams || typeof searchParams.getAll !== "function") {
    throw invalidQuery("Не удалось прочитать параметры запроса.");
  }

  const result = {
    completed: null,
    priority: null,
    categoryId: null,
    q: "",
  };

  for (const key of searchParams.keys()) {
    if (!ALLOWED_FILTERS.has(key)) {
      throw invalidQuery(`Неизвестный параметр: ${key}.`);
    }
  }

  for (const key of ALLOWED_FILTERS) {
    if (searchParams.getAll(key).length > 1) {
      throw invalidQuery(`Параметр ${key} нельзя повторять.`);
    }
  }

  if (searchParams.has("completed")) {
    const raw = searchParams.get("completed");
    if (raw !== "true" && raw !== "false") {
      throw invalidQuery("Параметр completed должен быть true или false.");
    }
    result.completed = raw === "true";
  }

  if (searchParams.has("priority")) {
    const raw = searchParams.get("priority");
    if (!ALLOWED_PRIORITIES.has(raw)) {
      throw invalidQuery("Параметр priority должен быть low, medium или high.");
    }
    result.priority = raw;
  }

  if (searchParams.has("categoryId")) {
    const raw = searchParams.get("categoryId");
    const value = parsePositiveId(raw);
    if (value === null) {
      throw invalidQuery("Параметр categoryId должен быть положительным безопасным целым числом без ведущих нулей.");
    }
    result.categoryId = value;
  }

  if (searchParams.has("q")) {
    const raw = searchParams.get("q");
    if (typeof raw !== "string") {
      throw invalidQuery("Параметр q должен быть строкой.");
    }
    result.q = raw.trim();
    if (result.q.length > 100) {
      throw invalidQuery("Параметр q не должен превышать 100 символов.");
    }
  }

  return result;
}
