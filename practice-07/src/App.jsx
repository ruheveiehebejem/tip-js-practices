import { useState } from "react";
import { tasks as initialTasks, categories } from "./data.js";
import { createInitialFilters } from "./variant.js";
import {
  addTask,
  getTaskStats,
  removeTask,
  selectTasks,
  toggleTask,
  updateTask,
} from "./domain/task-service.js";
import TaskForm from "./components/TaskForm.jsx";
import TaskFilters from "./components/TaskFilters.jsx";
import TaskList from "./components/TaskList.jsx";
import TaskStats from "./components/TaskStats.jsx";

export default function App() {
  const [tasks, setTasks] = useState(() => initialTasks.map((task) => ({ ...task })));
  const [filters, setFilters] = useState(createInitialFilters);
  const [editingId, setEditingId] = useState(null);

  const visibleTasks = selectTasks(tasks, filters);
  const stats = getTaskStats(tasks);
  const editingTask = editingId === null
    ? null
    : tasks.find((task) => task.id === editingId) ?? null;

  function handleSave(value) {
    if (editingId === null) {
      setTasks((previous) => {
        const maxId = previous.reduce((max, task) => Math.max(max, task.id), 0);
        return addTask(previous, value, maxId + 1);
      });
      return true;
    }

    if (!tasks.some((task) => task.id === editingId)) return false;
    setTasks((previous) => updateTask(previous, editingId, value));
    setEditingId(null);
    return true;
  }

  function handleDelete(id) {
    if (!window.confirm("Удалить эту задачу?")) return;
    setTasks((previous) => removeTask(previous, id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <main>
      <header>
        <h1>Задачи на React</h1>
        <p>ПР7: данные хранятся в памяти страницы. После перезагрузки восстанавливается исходный набор.</p>
      </header>

      <TaskStats stats={stats} />

      <TaskFilters
        filters={filters}
        categories={categories}
        onChange={setFilters}
      />

      <TaskForm
        key={editingId ?? "new"}
        categories={categories}
        initialTask={editingTask}
        onSave={handleSave}
        onCancel={() => setEditingId(null)}
      />

      <TaskList
        tasks={visibleTasks}
        categories={categories}
        onToggle={(id) => setTasks((previous) => toggleTask(previous, id))}
        onEdit={setEditingId}
        onDelete={handleDelete}
      />
    </main>
  );
}
