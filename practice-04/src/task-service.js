// Функции работы с задачами. Входные массивы и объекты не изменяются.

function isValidId(id) {
  return Number.isSafeInteger(id) && id > 0;
}

function isValidTitle(title) {
  return typeof title === "string"
    && title.trim().length >= 1
    && title.trim().length <= 100;
}

function isValidPriority(priority) {
  return ["low", "medium", "high"].includes(priority);
}

function errorResult(message) {
  return { ok: false, error: message };
}

export function createTask(id, title, priority = "medium") {
  if (!isValidId(id)) {
    return errorResult("ID должен быть положительным безопасным целым числом.");
  }

  if (!isValidTitle(title)) {
    return errorResult("Название должно содержать от 1 до 100 символов.");
  }

  if (!isValidPriority(priority)) {
    return errorResult("Приоритет должен быть low, medium или high.");
  }

  return {
    ok: true,
    task: {
      id,
      title: title.trim(),
      completed: false,
      priority,
    },
  };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed === true).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : (completed / total) * 100;

  return { total, completed, pending, progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  const result = createTask(id, title, priority);

  if (!result.ok) {
    return result;
  }

  if (findTaskById(tasks, id) !== undefined) {
    return errorResult("Задача с таким ID уже существует.");
  }

  return {
    ok: true,
    tasks: [...tasks, result.task],
  };
}

export function setTaskCompleted(tasks, id, completed) {
  if (!isValidId(id)) {
    return errorResult("ID должен быть положительным безопасным целым числом.");
  }

  if (typeof completed !== "boolean") {
    return errorResult("Статус completed должен иметь логическое значение.");
  }

  if (findTaskById(tasks, id) === undefined) {
    return errorResult("Задача с таким ID не найдена.");
  }

  const updatedTasks = tasks.map((task) =>
    task.id === id ? { ...task, completed } : task
  );

  return { ok: true, tasks: updatedTasks };
}

export function renameTask(tasks, id, title) {
  if (!isValidId(id)) {
    return errorResult("ID должен быть положительным безопасным целым числом.");
  }

  if (!isValidTitle(title)) {
    return errorResult("Название должно содержать от 1 до 100 символов.");
  }

  if (findTaskById(tasks, id) === undefined) {
    return errorResult("Задача с таким ID не найдена.");
  }

  const updatedTasks = tasks.map((task) =>
    task.id === id ? { ...task, title: title.trim() } : task
  );

  return { ok: true, tasks: updatedTasks };
}

export function removeTask(tasks, id) {
  if (!isValidId(id)) {
    return errorResult("ID должен быть положительным безопасным целым числом.");
  }

  if (findTaskById(tasks, id) === undefined) {
    return errorResult("Задача с таким ID не найдена.");
  }

  return {
    ok: true,
    tasks: tasks.filter((task) => task.id !== id),
  };
}


// Обновляет только название и приоритет выбранной задачи.
export function updateTask(tasks, id, title, priority) {
  if (!isValidId(id)) {
    return errorResult("ID должен быть положительным безопасным целым числом.");
  }
  const currentTask = findTaskById(tasks, id);
  if (currentTask === undefined) {
    return errorResult("Задача с таким ID не найдена.");
  }
  const newTask = createTask(id, title, priority);
  if (!newTask.ok) {
    return newTask;
  }
  const updatedTasks = tasks.map((task) =>
    task.id === id
      ? { ...task, title: newTask.task.title, priority: newTask.task.priority }
      : task
  );
  return { ok: true, tasks: updatedTasks };
}
