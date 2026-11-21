import { ApiError } from "./errors.js";
import { jsonBody } from "./json-body.js";
import { requireTask } from "./task-resource.js";
import { validateTaskInput } from "./task-validation.js";

export function registerWriteRoutes(router, store) {
  router.post("/tasks", ...jsonBody, (req, res) => {
    const categoryIds = new Set(
      store.listCategories().map((category) => category.id),
    );
    const value = validateTaskInput(req.body, { categoryIds });
    const task = store.createTask(value);

    return res
      .status(201)
      .location(`/api/tasks/${task.id}`)
      .json({ data: task });
  });

  router.patch(
    "/tasks/:id",
    requireTask(store),
    ...jsonBody,
    (req, res, next) => {
      const categoryIds = new Set(
        store.listCategories().map((category) => category.id),
      );
      const changes = validateTaskInput(req.body, {
        partial: true,
        categoryIds,
      });
      const task = store.updateTask(req.task.id, changes);

      if (task === null) {
        return next(new ApiError(
          404,
          "TASK_NOT_FOUND",
          "Задача не найдена.",
          { id: req.task.id },
        ));
      }

      return res.json({ data: task });
    },
  );

  router.delete("/tasks/:id", requireTask(store), (req, res, next) => {
    const deleted = store.deleteTask(req.task.id);

    if (!deleted) {
      return next(new ApiError(
        404,
        "TASK_NOT_FOUND",
        "Задача не найдена.",
        { id: req.task.id },
      ));
    }

    return res.status(204).end();
  });
}
