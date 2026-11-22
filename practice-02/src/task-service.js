
function isValidId(id) {
  return Number.isSafeInteger(id) && id > 0;
}

function isValidTitle(title) {
  return typeof title === "string" &&
    title.trim().length >= 1 &&
    title.trim().length <= 100;
}

function isValidPriority(priority) {
  return ["low", "medium", "high"].includes(priority);
}

export function createTask(id, title, priority = "medium") {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный идентификатор" };
  }

  if (!isValidTitle(title)) {
    return { ok: false, error: "Некорректное название задачи" };
  }

  if (!isValidPriority(priority)) {
    return { ok: false, error: "Некорректный приоритет" };
  }

  return {
    ok: true,
    task: {
      id,
      title: title.trim(),
      completed: false,
      priority
    }
  };
}

export function findTaskById(tasks, id) {
  return tasks.find(task => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter(task => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map(task => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed === true).length;
  const pending = total - completed;

  const progress = total > 0
    ? completed / total * 100
    : 0;

  return {
    total,
    completed,
    pending,
    progress
  };
}

export function addTask(tasks, id, title, priority = "medium") {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный идентификатор" };
  }

  if (tasks.some(task => task.id === id)) {
    return { ok: false, error: "Задача с таким ID уже существует" };
  }

  const result = createTask(id, title, priority);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    tasks: [...tasks, result.task]
  };
}

export function setTaskCompleted(tasks, id, completed) {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный идентификатор" };
  }

  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус должен быть логическим значением" };
  }

  const task = findTaskById(tasks, id);

  if (!task) {
    return { ok: false, error: "Задача не найдена" };
  }

  return {
    ok: true,
    tasks: tasks.map(item =>
      item.id === id
        ? { ...item, completed }
        : item
    )
  };
}

export function renameTask(tasks, id, title) {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный идентификатор" };
  }

  if (!isValidTitle(title)) {
    return { ok: false, error: "Некорректное название задачи" };
  }

  const task = findTaskById(tasks, id);

  if (!task) {
    return { ok: false, error: "Задача не найдена" };
  }

  return {
    ok: true,
    tasks: tasks.map(item =>
      item.id === id
        ? { ...item, title: title.trim() }
        : item
    )
  };
}

export function removeTask(tasks, id) {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный идентификатор" };
  }

  if (!findTaskById(tasks, id)) {
    return { ok: false, error: "Задача не найдена" };
  }

  return {
    ok: true,
    tasks: tasks.filter(task => task.id !== id)
  };
}
