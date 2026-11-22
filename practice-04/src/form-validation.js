
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};

  let id;

  if (editingId === null) {
    id = Number(draft.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      errors.id = "Введите положительный целый идентификатор";
    } else if (tasks.some(task => task.id === id)) {
      errors.id = "Задача с таким ID уже существует";
    }
  } else {
    id = editingId;

    if (!tasks.some(task => task.id === editingId)) {
      errors.id = "Редактируемая задача не найдена";
    }
  }

  const title = typeof draft.title === "string"
    ? draft.title.trim()
    : "";

  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов";
  }

  const priority = draft.priority;

  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите корректный приоритет";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      id,
      title,
      priority
    }
  };
}
