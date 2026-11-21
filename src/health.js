import { Router } from "express";

export function createHealthRouter({ store, version = "1.0.0" } = {}) {
  if (!store || typeof store.ping !== "function") {
    throw new TypeError("Health router требует store.ping.");
  }

  const router = Router();

  router.get("/health/live", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/health/ready", async (req, res) => {
    try {
      const connected = await store.ping();
      if (connected !== true) {
        return res.status(503).json({
          status: "error",
          database: "unavailable",
        });
      }
      return res.status(200).json({
        status: "ok",
        database: "connected",
        version,
      });
    } catch {
      return res.status(503).json({
        status: "error",
        database: "unavailable",
      });
    }
  });

  return router;
}
