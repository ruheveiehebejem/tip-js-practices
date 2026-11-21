import { Router } from "express";
import { ApiError } from "./errors.js";
import { createJsonBody } from "./json-body.js";
import { parseFilters, parsePositiveId } from "./validation.js";
import { requireTask } from "./task-resource.js";
import { validateTaskInput } from "./task-validation.js";

export function createRouter(store, {
  enableDebugReset = false,
  jsonBodyLimitBytes = 16 * 1024,
} = {}) {
  const router = Router({ caseSensitive: true });
  const jsonBody = createJsonBody(jsonBodyLimitBytes);

  router.get("/health", async (req, res) => {
    const connected = await store.ping();
    if (!connected) {
      return res.status(503).json({ data: { status: "error", database: "unavailable" } });
    }
    return res.json({ data: { status: "ok", database: "connected" } });
  });

  router.get("/categories", async (req, res) => {
    const data = await store.listCategories();
    return res.json({ data, meta: { total: data.length } });
  });

  router.get("/tasks", async (req, res) => {
    const url = new URL(req.originalUrl, "http://localhost");
    const filters = parseFilters(url.searchParams);
    const data = await store.listTasks(filters);
    return res.json({ data, meta: { total: data.length, filters } });
  });

  router.get("/tasks/:id", async (req, res, next) => {
    const id = parsePositiveId(req.params.id);
    if (id === null) {
      return next(new ApiError(400, "INVALID_ID", "Некорректный идентификатор задачи."));
    }
    const task = await store.getTask(id);
    if (task === null || task === undefined) {
      return next(new ApiError(404, "TASK_NOT_FOUND", "Задача не найдена.", { id }));
    }
    return res.json({ data: task });
  });

  router.post("/tasks", ...jsonBody, async (req, res) => {
    const categoryIds = new Set((await store.listCategories()).map((item) => item.id));
    const value = validateTaskInput(req.body, { categoryIds });
    const task = await store.createTask(value);
    return res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  router.patch("/tasks/:id", requireTask(store), ...jsonBody, async (req, res, next) => {
    const categoryIds = new Set((await store.listCategories()).map((item) => item.id));
    const changes = validateTaskInput(req.body, { partial: true, categoryIds });
    const task = await store.updateTask(req.task.id, changes);
    if (task === null) {
      return next(new ApiError(404, "TASK_NOT_FOUND", "Задача не найдена.", { id: req.task.id }));
    }
    return res.json({ data: task });
  });

  router.delete("/tasks/:id", requireTask(store), async (req, res, next) => {
    const deleted = await store.deleteTask(req.task.id);
    if (!deleted) {
      return next(new ApiError(404, "TASK_NOT_FOUND", "Задача не найдена.", { id: req.task.id }));
    }
    return res.status(204).end();
  });

  if (enableDebugReset) {
    router.post("/debug/reset", async (req, res) => {
      const result = await store.reset();
      return res.json({ data: result });
    });
  }

  for (const path of ["/health", "/categories", "/tasks", "/tasks/:id"]) {
    router.all(path, (req, res, next) => {
      res.set("Allow", "GET, HEAD, POST, PATCH, DELETE, OPTIONS");
      next(new ApiError(405, "METHOD_NOT_ALLOWED", "Метод не поддерживается для этого маршрута."));
    });
  }

  return router;
}
