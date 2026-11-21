import { ApiError } from "./errors.js";

const WRITABLE_FIELDS = new Set(["title", "priority", "categoryId", "completed"]);
const POST_FIELDS = new Set(["title", "priority", "categoryId"]);
const PRIORITIES = new Set(["low", "medium", "high"]);

function addError(details, field, message) {
  details[field] = message;
}

export function validateTaskInput(value, { partial = false, categoryIds } = {}) {
  const details = Object.create(null);

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    addError(details, "body", "Тело запроса должно быть JSON-объектом.");
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Данные не прошли проверку.",
      details,
    );
  }

  const allowedFields = partial ? WRITABLE_FIELDS : POST_FIELDS;
  const ownKeys = Object.keys(value);

  for (const key of ownKeys) {
    if (!allowedFields.has(key)) {
      if (key === "id") {
        addError(details, "id", "Поле id назначается сервером и не может передаваться.");
      } else if (key === "completed" && !partial) {
        addError(details, "completed", "При создании completed устанавливается сервером.");
      } else {
        addError(details, key, "Неизвестное или недопустимое поле.");
      }
    }
  }

  if (!partial) {
    for (const field of POST_FIELDS) {
      if (!Object.hasOwn(value, field)) {
        addError(details, field, "Обязательное поле не передано.");
      }
    }
  } else {
    const hasAllowedField = ownKeys.some((key) => WRITABLE_FIELDS.has(key));
    if (!hasAllowedField) {
      addError(details, "body", "PATCH должен содержать хотя бы одно разрешённое поле.");
    }
  }

  const result = {};

  if (Object.hasOwn(value, "title") && allowedFields.has("title")) {
    if (typeof value.title !== "string") {
      addError(details, "title", "Название должно быть строкой.");
    } else {
      const title = value.title.trim();
      if (title.length < 1 || title.length > 100) {
        addError(details, "title", "Название после trim должно содержать от 1 до 100 символов.");
      } else {
        result.title = title;
      }
    }
  }

  if (Object.hasOwn(value, "priority") && allowedFields.has("priority")) {
    if (typeof value.priority !== "string" || !PRIORITIES.has(value.priority)) {
      addError(details, "priority", "Приоритет должен быть low, medium или high.");
    } else {
      result.priority = value.priority;
    }
  }

  if (Object.hasOwn(value, "categoryId") && allowedFields.has("categoryId")) {
    const categoryId = value.categoryId;
    if (
      !Number.isSafeInteger(categoryId) ||
      categoryId <= 0 ||
      !(categoryIds instanceof Set) ||
      !categoryIds.has(categoryId)
    ) {
      addError(details, "categoryId", "Укажите существующую категорию целым числом.");
    } else {
      result.categoryId = categoryId;
    }
  }

  if (partial && Object.hasOwn(value, "completed")) {
    if (typeof value.completed !== "boolean") {
      addError(details, "completed", "completed должен иметь логическое значение.");
    } else {
      result.completed = value.completed;
    }
  }

  if (Object.keys(details).length > 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Данные не прошли проверку.",
      details,
    );
  }

  return result;
}
