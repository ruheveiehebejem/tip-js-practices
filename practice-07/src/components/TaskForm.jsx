import { useState } from "react";
import { validateTaskDraft } from "../domain/task-service.js";

function createInitialDraft(task, categories) {
  return {
    title: task?.title ?? "",
    priority: task?.priority ?? "medium",
    categoryId: task
      ? String(task.categoryId)
      : categories.length > 0 ? String(categories[0].id) : "",
  };
}

export default function TaskForm({ categories, initialTask = null, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => createInitialDraft(initialTask, categories));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validation = validateTaskDraft(draft, categories);
    if (!validation.valid) {
      setErrors(validation.errors);
      setMessage("Проверьте заполнение полей.");
      return;
    }

    const accepted = onSave(validation.value);
    if (accepted) {
      setErrors({});
      setMessage(initialTask ? "Изменения сохранены." : "Задача добавлена.");
      if (!initialTask) setDraft(createInitialDraft(null, categories));
    } else {
      setMessage("Не удалось сохранить задачу. Возможно, она уже была удалена.");
    }
  }

  function handleCancel() {
    setErrors({});
    setMessage("");
    onCancel();
  }

  return (
    <section aria-label="Форма задачи">
      <h2>{initialTask ? "Редактирование задачи" : "Новая задача"}</h2>
      <form noValidate onSubmit={handleSubmit}>
        <div>
          <label htmlFor="task-title">Название</label>
          <input
            id="task-title"
            name="title"
            type="text"
            value={draft.title}
            onChange={handleChange}
            aria-invalid={Boolean(errors.title)}
            aria-describedby="task-title-error"
          />
          <p id="task-title-error" className="error" role="alert">{errors.title ?? ""}</p>
        </div>

        <div>
          <label htmlFor="task-priority">Приоритет</label>
          <select
            id="task-priority"
            name="priority"
            value={draft.priority}
            onChange={handleChange}
            aria-invalid={Boolean(errors.priority)}
            aria-describedby="task-priority-error"
          >
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
          <p id="task-priority-error" className="error" role="alert">{errors.priority ?? ""}</p>
        </div>

        <div>
          <label htmlFor="task-category">Категория</label>
          <select
            id="task-category"
            name="categoryId"
            value={draft.categoryId}
            onChange={handleChange}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby="task-category-error"
          >
            <option value="">Выберите категорию</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>{category.name}</option>
            ))}
          </select>
          <p id="task-category-error" className="error" role="alert">{errors.categoryId ?? ""}</p>
        </div>

        <div className="actions">
          <button type="submit">{initialTask ? "Сохранить изменения" : "Добавить задачу"}</button>
          {initialTask && <button type="button" onClick={handleCancel}>Отмена</button>}
        </div>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
