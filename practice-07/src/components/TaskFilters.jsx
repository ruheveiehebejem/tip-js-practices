const EMPTY_FILTERS = {
  q: "",
  completed: "",
  priority: "",
  categoryId: "",
};

export default function TaskFilters({ filters, categories, onChange }) {
  function update(name, value) {
    onChange({ ...filters, [name]: value });
  }

  function resetFilters() {
    onChange({ ...EMPTY_FILTERS });
  }

  return (
    <section aria-label="Фильтры">
      <h2>Фильтры задач</h2>
      <label htmlFor="filter-query">Поиск по названию</label>
      <input
        id="filter-query"
        name="q"
        type="search"
        value={filters.q}
        onChange={(event) => update("q", event.target.value)}
      />

      <label htmlFor="filter-completed">Статус</label>
      <select
        id="filter-completed"
        name="completed"
        value={filters.completed}
        onChange={(event) => update("completed", event.target.value)}
      >
        <option value="">Все статусы</option>
        <option value="false">В работе</option>
        <option value="true">Выполненные</option>
      </select>

      <label htmlFor="filter-priority">Приоритет</label>
      <select
        id="filter-priority"
        name="priority"
        value={filters.priority}
        onChange={(event) => update("priority", event.target.value)}
      >
        <option value="">Все приоритеты</option>
        <option value="low">Низкий</option>
        <option value="medium">Средний</option>
        <option value="high">Высокий</option>
      </select>

      <label htmlFor="filter-category">Категория</label>
      <select
        id="filter-category"
        name="categoryId"
        value={filters.categoryId}
        onChange={(event) => update("categoryId", event.target.value)}
      >
        <option value="">Все категории</option>
        {categories.map((category) => (
          <option key={category.id} value={String(category.id)}>{category.name}</option>
        ))}
      </select>

      <button type="button" onClick={resetFilters}>Сбросить фильтры</button>
    </section>
  );
}
