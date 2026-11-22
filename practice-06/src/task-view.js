
const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

function createButton(action, label) {
  const button = document.createElement("button");

  button.type = "button";
  button.dataset.action = action;

  const span = document.createElement("span");
  span.className = "action-label";
  span.textContent = label;

  button.append(span);

  return button;
}

export function createTaskElement(task, category) {
  const item = document.createElement("li");

  item.className = task.completed
    ? "task-card is-completed"
    : "task-card";

  item.dataset.taskId = String(task.id);

  // Название задачи.
  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  // Статус.
  const status = document.createElement("p");
  status.className = "task-status";
  status.textContent = task.completed ? "Выполнена" : "В работе";

  // Приоритет.
  const priority = document.createElement("p");
  priority.className = "task-priority";
  priority.textContent = `Приоритет: ${PRIORITY_LABELS[task.priority] ?? task.priority}`;

  // Категория.
  const categoryElement = document.createElement("p");
  categoryElement.className = "task-category";
  categoryElement.textContent = category?.name ?? "Без категории";

  // Кнопки действий.
  const actions = document.createElement("div");
  actions.className = "task-actions";

  const toggleButton = createButton(
    "toggle",
    task.completed ? "Вернуть в работу" : "Завершить",
  );

  const editButton = createButton("edit", "Изменить");
  const deleteButton = createButton("delete", "Удалить");

  actions.append(toggleButton, editButton, deleteButton);

  item.append(
    title,
    status,
    priority,
    categoryElement,
    actions,
  );

  return item;
}

export function renderTaskList(list, tasks, categories) {
  const categoryMap = new Map(
    categories.map((category) => [category.id, category]),
  );

  const elements = tasks.map((task) => {
    const category = categoryMap.get(task.categoryId);
    return createTaskElement(task, category);
  });

  list.replaceChildren(...elements);
}
