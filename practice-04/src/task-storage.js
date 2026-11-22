
export const STORAGE_VERSION = 1;

function copyTasks(tasks) {
  return tasks.map(task => ({ ...task }));
}

export function isValidTaskList(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set();

  for (const task of value) {
    if (task === null || typeof task !== "object" || Array.isArray(task)) {
      return false;
    }

    if (!Number.isSafeInteger(task.id) || task.id <= 0) {
      return false;
    }

    if (ids.has(task.id)) {
      return false;
    }

    if (typeof task.title !== "string") {
      return false;
    }

    const title = task.title.trim();

    if (title.length < 1 || title.length > 100) {
      return false;
    }

    if (typeof task.completed !== "boolean") {
      return false;
    }

    if (!["low", "medium", "high"].includes(task.priority)) {
      return false;
    }

    ids.add(task.id);
  }

  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  try {
    const saved = storage.getItem(key);

    if (saved === null) {
      return {
        ok: true,
        source: "initial",
        tasks: copyTasks(fallbackTasks)
      };
    }

    const data = JSON.parse(saved);

    if (
      data === null ||
      typeof data !== "object" ||
      data.version !== STORAGE_VERSION ||
      !isValidTaskList(data.tasks)
    ) {
      throw new Error("Сохранённые данные имеют неправильный формат");
    }

    return {
      ok: true,
      source: "storage",
      tasks: copyTasks(data.tasks)
    };
  } catch (error) {
    return {
      ok: false,
      source: "fallback",
      tasks: copyTasks(fallbackTasks),
      error: `Не удалось загрузить данные: ${error.message}`
    };
  }
}

export function saveTasks(storage, key, tasks) {
  try {
    if (!isValidTaskList(tasks)) {
      return {
        ok: false,
        error: "Нельзя сохранить некорректный список задач"
      };
    }

    const data = {
      version: STORAGE_VERSION,
      tasks
    };

    storage.setItem(key, JSON.stringify(data));

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Не удалось сохранить данные: ${error.message}`
    };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Не удалось удалить данные: ${error.message}`
    };
  }
}
