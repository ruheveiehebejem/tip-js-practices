// Предметная логика чтения. Модуль не зависит от Express и не изменяет входные данные.

export function selectTasks(tasks, filters) {
  const query = filters.q.trim().toLocaleLowerCase("ru-RU");

  return tasks.filter((task) => {
    if (filters.completed !== null && task.completed !== filters.completed) {
      return false;
    }
    if (filters.priority !== null && task.priority !== filters.priority) {
      return false;
    }
    if (filters.categoryId !== null && task.categoryId !== filters.categoryId) {
      return false;
    }
    if (
      query !== "" &&
      !task.title.toLocaleLowerCase("ru-RU").includes(query)
    ) {
      return false;
    }
    return true;
  });
}

export function findTask(tasks, id) {
  return tasks.find((task) => task.id === id) ?? null;
}
