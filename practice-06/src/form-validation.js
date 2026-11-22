
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, categories) {
  const errors = {};

  const title = typeof draft?.title === "string"
    ? draft.title.trim()
    : "";

  const priority = draft?.priority;

  const rawCategoryId = draft?.categoryId;
  const categoryId = typeof rawCategoryId === "number"
    ? rawCategoryId
    : typeof rawCategoryId === "string" && /^\d+$/.test(rawCategoryId)
      ? Number(rawCategoryId)
      : NaN;

  // Проверка названия.
  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов.";
  }

  // Проверка приоритета.
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите допустимый приоритет.";
  }

  // Проверка категории.
  const categoryExists = Array.isArray(categories)
    && categories.some((category) => category.id === categoryId);

  if (!Number.isSafeInteger(categoryId) || categoryId <= 0 || !categoryExists) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    value: {
      title,
      priority,
      categoryId,
    },
    errors,
  };
}
