import { Router } from "express";
import { ApiError } from "./errors.js";
import { parseFilters, parsePositiveId } from "./validation.js";

export function createRouter(store) {
  const router = Router({ caseSensitive: true });

  router.get("/health", (req, res) => {
    res.json({ data: { status: "ok" } });
  });

  router.get("/categories", (req, res) => {
    const data = store.listCategories();
    res.json({
      data,
      meta: { total: data.length },
    });
  });

  router.get("/tasks", (req, res) => {
    const url = new URL(req.originalUrl, "http://localhost");
    const filters = parseFilters(url.searchParams);
    const data = store.listTasks(filters);

    res.json({
      data,
      meta: {
        total: data.length,
        filters,
      },
    });
  });

  router.get("/tasks/:id", (req, res, next) => {
    const id = parsePositiveId(req.params.id);
    if (id === null) {
      return next(new ApiError(400, "INVALID_ID", "Некорректный идентификатор задачи."));
    }

    const task = store.getTask(id);
    if (task === null || task === undefined) {
      return next(new ApiError(404, "TASK_NOT_FOUND", "Задача не найдена.", { id }));
    }

    return res.json({ data: task });
  });

  // Эти обработчики стоят после GET, чтобы не перехватывать разрешённое чтение.
  for (const path of ["/health", "/categories", "/tasks", "/tasks/:id"]) {
    router.all(path, (req, res, next) => {
      res.set("Allow", "GET, HEAD, OPTIONS");
      next(new ApiError(
        405,
        "METHOD_NOT_ALLOWED",
        "Для этого маршрута разрешены только GET, HEAD и OPTIONS.",
      ));
    });
  }

  return router;
}
