-- Q1. Все задачи с названием категории, сортировка по id задачи.
SELECT
  t.id,
  t.title,
  t.completed,
  t.priority,
  t.category_id AS "categoryId",
  c.name AS category_name
FROM public.tasks AS t
JOIN public.categories AS c ON c.id = t.category_id
ORDER BY t.id;

-- Q2. Невыполненные задачи высокого приоритета в категории 2 (id 4 и 34).
SELECT
  t.id,
  t.title,
  t.priority,
  t.category_id AS "categoryId"
FROM public.tasks AS t
WHERE t.completed = false
  AND t.priority = 'high'
  AND t.category_id = 2
ORDER BY t.id;

-- Q3. Поиск «ПРОВЕР» в названии без учёта регистра (id 7 и 16).
SELECT
  t.id,
  t.title,
  t.completed,
  t.priority
FROM public.tasks AS t
WHERE t.title ILIKE '%ПРОВЕР%'
ORDER BY t.id;

-- Q4. Количество задач в каждой категории, включая категории без задач.
SELECT
  c.id,
  c.name,
  count(t.id) AS task_count
FROM public.categories AS c
LEFT JOIN public.tasks AS t ON t.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;

-- Q5. Количество выполненных и невыполненных задач в каждой категории.
SELECT
  c.id,
  c.name,
  count(t.id) FILTER (WHERE t.completed = true) AS completed_count,
  count(t.id) FILTER (WHERE t.completed = false) AS pending_count
FROM public.categories AS c
LEFT JOIN public.tasks AS t ON t.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;

-- Q6. Категории, в которых не менее четырёх задач.
SELECT
  c.id,
  c.name,
  count(t.id) AS task_count
FROM public.categories AS c
JOIN public.tasks AS t ON t.category_id = c.id
GROUP BY c.id, c.name
HAVING count(t.id) >= 4
ORDER BY c.id;

-- Q7. Задача id 4 с именами полей, совместимыми с API.
SELECT
  t.id,
  t.title,
  t.completed,
  t.priority,
  t.category_id AS "categoryId"
FROM public.tasks AS t
WHERE t.id = 4;
