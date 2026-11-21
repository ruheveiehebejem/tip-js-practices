import { notImplemented } from './errors.js';

export const taskColumns = 'id, title, completed, priority, category_id AS "categoryId"';

export function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function buildListTasksQuery(filters) {
  const conditions = [];
  const values = [];
  if (filters.completed !== null && filters.completed !== undefined) {
    values.push(filters.completed);
    conditions.push('completed = $' + values.length);
  }
  if (filters.priority !== null && filters.priority !== undefined) {
    values.push(filters.priority);
    conditions.push('priority = $' + values.length);
  }
  if (filters.categoryId !== null && filters.categoryId !== undefined) {
    values.push(filters.categoryId);
    conditions.push('category_id = $' + values.length);
  }
  const q = typeof filters.q === 'string' ? filters.q.trim() : '';
  if (q !== '') {
    values.push('%' + escapeLikePattern(q) + '%');
    conditions.push("title ILIKE $" + values.length + " ESCAPE '\\'");
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  return {
    text: 'SELECT ' + taskColumns + ' FROM public.tasks' + where + ' ORDER BY id',
    values,
  };
}

export function buildUpdateTaskQuery(id, changes) {
  if (changes === null || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new TypeError('Изменения должны быть объектом.');
  }
  const fields = [
    ['title', 'title'],
    ['completed', 'completed'],
    ['priority', 'priority'],
    ['categoryId', 'category_id'],
  ];
  const allowed = new Set(fields.map(([key]) => key));
  for (const key of Object.keys(changes)) {
    if (!allowed.has(key)) throw new TypeError('Неизвестное поле для изменения: ' + key + '.');
  }
  const assignments = [];
  const values = [];
  for (const [property, column] of fields) {
    if (Object.hasOwn(changes, property)) {
      values.push(changes[property]);
      assignments.push(column + ' = $' + values.length);
    }
  }
  if (assignments.length === 0) throw new TypeError('Передайте хотя бы одно поле для изменения.');
  values.push(id);
  return {
    text: 'UPDATE public.tasks SET ' + assignments.join(', ') +
      ' WHERE id = $' + values.length + ' RETURNING ' + taskColumns,
    values,
  };
}
