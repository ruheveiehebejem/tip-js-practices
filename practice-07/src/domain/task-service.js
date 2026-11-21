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

  const rawCategory = draft?.categoryId;
  const categoryId = typeof rawCategory === "string" && rawCategory.trim() !== ""
    ? Number(rawCategory)
    : rawCategory;
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
  return { valid: true, value: { title, priority, categoryId }, errors: {} };
}

export function selectTasks(tasks, filters = {}) {
  const query = typeof filters.q === "string"
    ? filters.q.trim().toLocaleLowerCase("ru-RU")
    : "";
  return tasks.filter((task) => {
    if (query && !task.title.toLocaleLowerCase("ru-RU").includes(query)) return false;
    if (filters.completed === "true" && task.completed !== true) return false;
    if (filters.completed === "false" && task.completed !== false) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.categoryId && String(task.categoryId) !== String(filters.categoryId)) return false;
    return true;
  });
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return { total, completed, active: total - completed };
}

export function addTask(tasks, value, id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError("ID должен быть положительным безопасным целым числом.");
  }
  if (tasks.some((task) => task.id === id)) {
    throw new TypeError("Задача с таким ID уже существует.");
  }
  const newTask = {
    id,
    title: value.title,
    completed: false,
    priority: value.priority,
    categoryId: value.categoryId,
  };
  return [...tasks, newTask];
}

export function updateTask(tasks, id, value) {
  if (!tasks.some((task) => task.id === id)) return tasks;
  return tasks.map((task) => task.id === id
    ? {
        ...task,
        title: value.title,
        priority: value.priority,
        categoryId: value.categoryId,
      }
    : task);
}

export function toggleTask(tasks, id) {
  if (!tasks.some((task) => task.id === id)) return tasks;
  return tasks.map((task) => task.id === id
    ? { ...task, completed: !task.completed }
    : task);
}

export function removeTask(tasks, id) {
  if (!tasks.some((task) => task.id === id)) return tasks;
  return tasks.filter((task) => task.id !== id);
}
