import pg from "pg";

const { Pool } = pg;

export function createPool(connectionString, { logger } = {}) {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
  });

  pool.on("error", (error) => {
    logger?.error?.("database.pool.error", {
      code: typeof error?.code === "string" ? error.code : "UNKNOWN",
      name: error?.name ?? "Error",
    });
  });

  return pool;
}
