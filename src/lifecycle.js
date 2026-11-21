export function createShutdown({
  server,
  pool,
  logger,
  timeoutMs = 10000,
} = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  let shutdownPromise = null;

  return function shutdown(signal = "SIGTERM") {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      let timer;
      const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Тайм-аут graceful shutdown.")), timeoutMs);
        timer.unref?.();
      });

      const closeResources = async () => {
        if (server && typeof server.close === "function") {
          await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
          });
        }
        if (pool && typeof pool.end === "function") {
          await pool.end();
        }
      };

      try {
        await Promise.race([closeResources(), timeout]);
        logger?.info?.("server.shutdown", { signal, result: "completed" });
      } catch (error) {
        logger?.error?.("server.shutdown", {
          signal,
          result: "failed",
          error: error.message,
        });
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })();

    return shutdownPromise;
  };
}
