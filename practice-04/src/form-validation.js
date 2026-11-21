import { findTaskById } from "./task-service.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  let id;

  if (editingId === null) {
    const rawId = draft?.id;
    const idText = typeof rawId === "string" ? rawId.trim() : rawId;
    id = Number(idText);
    if (
      idText === "" ||
      idText === null ||
      idText === undefined ||
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      errors.id = "Введите положительный безопасный целый ID.";
    } else if (findTaskById(tasks, id) !== undefined) {
      errors.id = "Задача с таким ID уже существует.";
    }
  } else {
    id = editingId;
    if (!Number.isSafeInteger(id) || id <= 0 || findTaskById(tasks, id) === undefined) {
      errors.id = "Не удалось найти задачу для редактирования.";
    }
  }

  const rawTitle = draft?.title;
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов.";
  }

  const priority = draft?.priority;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет low, medium или high.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { id, title, priority } };
}
