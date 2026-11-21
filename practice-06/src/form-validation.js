const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, categories) {
  const errors = {};
  const title = typeof draft?.title === "string" ? draft.title.trim() : "";
  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов.";
  }

  const priority = draft?.priority;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет low, medium или high.";
  }

  const rawCategoryId = draft?.categoryId;
  const categoryId = typeof rawCategoryId === "string" && rawCategoryId.trim() !== ""
    ? Number(rawCategoryId)
    : rawCategoryId;
  if (
    !Number.isSafeInteger(categoryId) ||
    categoryId <= 0 ||
    !Array.isArray(categories) ||
    !categories.some((category) => category.id === categoryId)
  ) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, value: null, errors };
  }
  return {
    valid: true,
    value: { title, priority, categoryId },
    errors: {},
  };
}
