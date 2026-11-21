const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

export function createTaskElement(task, category) {
  const card = document.createElement("li");
  card.className = "task-card";
  card.dataset.taskId = String(task.id);
  if (task.completed) card.classList.add("is-completed");

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const status = document.createElement("p");
  status.className = "task-status";
  status.textContent = task.completed ? "Выполнена" : "В работе";

  const priority = document.createElement("p");
  priority.className = "task-priority";
  priority.textContent = PRIORITY_LABELS[task.priority] ?? "Не указан";

  const categoryName = document.createElement("p");
  categoryName.className = "task-category";
  categoryName.textContent = category?.name ?? "Категория не найдена";

  const actions = document.createElement("div");
  actions.className = "task-actions";
  for (const [action, label] of [
    ["toggle", task.completed ? "Вернуть в работу" : "Выполнена"],
    ["edit", "Изменить"],
    ["delete", "Удалить"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    if (action === "toggle") button.setAttribute("aria-pressed", String(task.completed));
    const span = document.createElement("span");
    span.className = "action-label";
    span.textContent = label;
    button.append(span);
    actions.append(button);
  }

  card.append(title, status, priority, categoryName, actions);
  return card;
}

export function renderTaskList(list, tasks, categories) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const cards = tasks.map((task) => createTaskElement(task, categoryById.get(task.categoryId)));
  list.replaceChildren(...cards);
}
