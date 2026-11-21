import express from "express";
import { createRouter } from "./routes.js";
import { errorHandler, ApiError } from "./errors.js";
import { createHealthRouter } from "./health.js";
import { createLogger, requestLogger } from "./logger.js";

export function createApp({
  store,
  enableDebugReset = false,
  jsonBodyLimitBytes = 16 * 1024,
  releaseVersion = "1.0.0",
  logger = createLogger({ level: "error" }),
} = {}) {
  if (!store) throw new TypeError("createApp требует store.");
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Location, X-Request-Id");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  app.use(requestLogger({ logger }));
  app.use(createHealthRouter({ store, version: releaseVersion }));
  app.use("/api", createRouter(store, { enableDebugReset, jsonBodyLimitBytes }));

  app.use((req, res, next) => {
    next(new ApiError(404, "ROUTE_NOT_FOUND", "Маршрут не найден."));
  });
  app.use(errorHandler);

  return app;
}
