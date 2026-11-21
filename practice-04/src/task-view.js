import { getTaskStats } from "./task-service.js";

const priorityLabels = { low: "Низкий", medium: "Средний", high: "Высокий" };

export function createTaskElement(task) {
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
  priority.textContent = priorityLabels[task.priority];

  const actions = document.createElement("div");
  actions.className = "task-actions";
  for (const [action, label] of [
    ["toggle", "Выполнена"],
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

  card.append(title, status, priority, actions);
  return card;
}

export function renderTaskList(listElement, tasks) {
  listElement.replaceChildren(...tasks.map(createTaskElement));
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  const stats = getTaskStats(tasks);
  summaryElement.querySelector('[data-stat="total"]').textContent = String(stats.total);
  summaryElement.querySelector('[data-stat="completed"]').textContent = String(stats.completed);
  summaryElement.querySelector('[data-stat="pending"]').textContent = String(stats.pending);
  summaryElement.querySelector('[data-stat="progress"]').textContent = stats.progress.toFixed(1) + "%";
  summaryElement.querySelector('[data-stat="visible"]').textContent = String(visibleCount);
}

export function renderEmptyState(messageElement, total, visibleCount) {
  if (visibleCount > 0) {
    messageElement.textContent = "";
    messageElement.hidden = true;
  } else if (total === 0) {
    messageElement.textContent = "Список задач пуст.";
    messageElement.hidden = false;
  } else {
    messageElement.textContent = "Нет задач по выбранному фильтру.";
    messageElement.hidden = false;
  }
}
