import { pathToFileURL } from "node:url";
import { readConfig } from "./config.js";
import { createPool } from "./db.js";
import { createPostgresStore } from "./store.js";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";
import { createShutdown } from "./lifecycle.js";

export async function startServer(config = readConfig()) {
  const logger = createLogger({ level: config.logLevel });
  const pool = createPool(config.connectionString, { logger });
  const store = createPostgresStore(pool);

  try {
    await store.ping();
    const app = createApp({
      store,
      enableDebugReset: config.enableDebugReset,
      jsonBodyLimitBytes: config.jsonBodyLimitBytes,
      releaseVersion: config.releaseVersion,
      logger,
    });

    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port, config.host, () => resolve(listener));
      listener.once("error", reject);
    });

    logger.info("server.started", {
      host: config.host,
      port: config.port,
      version: config.releaseVersion,
      environment: config.nodeEnv,
    });

    const shutdown = createShutdown({ server, pool, logger });
    return { app, server, pool, store, logger, shutdown };
  } catch (error) {
    await pool.end().catch(() => {});
    logger.error("server.start.failed", { error: error.message });
    throw error;
  }
}

async function main() {
  const running = await startServer();
  const handleSignal = (signal) => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    running.shutdown(signal).then(
      () => { process.exitCode = 0; },
      () => { process.exitCode = 1; },
    );
  };
  const onSigint = () => handleSignal("SIGINT");
  const onSigterm = () => handleSignal("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Не удалось запустить API:", error.message);
    process.exitCode = 1;
  });
}
