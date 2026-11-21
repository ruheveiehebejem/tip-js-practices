import { buildListTasksQuery, buildUpdateTaskQuery, taskColumns } from './query-builders.js';

const noFilters = { completed: null, priority: null, categoryId: null, q: '' };
const seedCategories = [
  { id: 1, name: 'Учёба' },
  { id: 2, name: 'Проект' },
  { id: 3, name: 'Организация' },
];
const seedTasks = [
  { id: 1, title: 'Изучить функции', completed: true, priority: 'medium', categoryId: 1 },
  { id: 4, title: 'Подготовить модель задач', completed: false, priority: 'high', categoryId: 2 },
  { id: 7, title: 'Проверить методы массивов', completed: false, priority: 'low', categoryId: 1 },
  { id: 10, title: 'Оформить README', completed: true, priority: 'medium', categoryId: 3 },
  { id: 13, title: 'Разобрать Promise', completed: false, priority: 'high', categoryId: 1 },
  { id: 16, title: 'Проверить учебный API', completed: true, priority: 'high', categoryId: 2 },
  { id: 19, title: 'Описать контракт запросов', completed: false, priority: 'medium', categoryId: 3 },
  { id: 22, title: 'Подготовить демонстрацию', completed: false, priority: 'low', categoryId: 2 },
  { id: 25, title: 'Исправить обработку ошибок', completed: true, priority: 'high', categoryId: 2 },
  { id: 28, title: 'Добавить фильтры API', completed: false, priority: 'medium', categoryId: 2 },
  { id: 31, title: 'Сверить отчёт', completed: true, priority: 'low', categoryId: 3 },
  { id: 34, title: 'Провести рефакторинг клиента', completed: false, priority: 'high', categoryId: 2 },
];

function makeInsert(rows, fields, table, columns) {
  const values = [];
  const tuples = rows.map((row) => {
    const placeholders = fields.map((field) => {
      values.push(row[field]);
      return '$' + values.length;
    });
    return '(' + placeholders.join(', ') + ')';
  });
  return {
    text: 'INSERT INTO ' + table + ' (' + columns + ') VALUES ' + tuples.join(', '),
    values,
  };
}

export function createPostgresStore(pool) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('Требуется пул PostgreSQL.');
  return {
    async ping() {
      const result = await pool.query('SELECT 1 AS ok');
      return result.rows[0]?.ok === 1;
    },
    async listCategories() {
      const result = await pool.query('SELECT id, name FROM public.categories ORDER BY id');
      return result.rows;
    },
    async listTasks(filters = noFilters) {
      const result = await pool.query(buildListTasksQuery(filters));
      return result.rows;
    },
    async getTask(id) {
      const result = await pool.query({
        text: 'SELECT ' + taskColumns + ' FROM public.tasks WHERE id = $1',
        values: [id],
      });
      return result.rows[0] ?? null;
    },
    async createTask(value) {
      const result = await pool.query({
        text: 'INSERT INTO public.tasks (title, priority, category_id) VALUES ($1, $2, $3) RETURNING ' + taskColumns,
        values: [value.title, value.priority, value.categoryId],
      });
      return result.rows[0] ?? null;
    },
    async updateTask(id, changes) {
      const result = await pool.query(buildUpdateTaskQuery(id, changes));
      return result.rows[0] ?? null;
    },
    async deleteTask(id) {
      const result = await pool.query({
        text: 'DELETE FROM public.tasks WHERE id = $1',
        values: [id],
      });
      return result.rowCount === 1;
    },
    async reset() {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM public.tasks');
        await client.query('DELETE FROM public.categories');
        const categoryInsert = makeInsert(seedCategories, ['id', 'name'], 'public.categories', 'id, name');
        await client.query(categoryInsert);
        const taskInsert = makeInsert(
          seedTasks,
          ['id', 'title', 'completed', 'priority', 'categoryId'],
          'public.tasks',
          'id, title, completed, priority, category_id',
        );
        await client.query(taskInsert);
        await client.query("SELECT setval(pg_get_serial_sequence('public.categories', 'id'), (SELECT max(id) FROM public.categories), true)");
        await client.query("SELECT setval(pg_get_serial_sequence('public.tasks', 'id'), (SELECT max(id) FROM public.tasks), true)");
        await client.query('COMMIT');
        return { reset: true, total: seedTasks.length };
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* сохраняем исходную ошибку */ }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
