-- Вариант 8: доля выполненных задач каждой категории в процентах.
-- LEFT JOIN сохраняет пустые категории. При отсутствии задач процент равен 0.0.
SELECT
  c.id,
  c.name,
  count(t.id) AS total_tasks,
  count(t.id) FILTER (WHERE t.completed = true) AS completed_tasks,
  coalesce(
    round(
      100.0 * count(t.id) FILTER (WHERE t.completed = true)
      / nullif(count(t.id), 0),
      1
    ),
    0.0
  ) AS completed_percent
FROM public.categories AS c
LEFT JOIN public.tasks AS t ON t.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
