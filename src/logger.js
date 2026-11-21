import { randomUUID } from "node:crypto";

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
const SECRET_KEY = /password|authorization|cookie|connectionstring|databaseurl|secret|token/i;

function sanitize(value, key = "", seen = new WeakSet()) {
  if (SECRET_KEY.test(key)) return "[REDACTED]";
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && value.length > 2000) return value.slice(0, 2000) + "…";
    return value;
  }
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: value.code };
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, "", seen));

  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = sanitize(childValue, childKey, seen);
  }
  return result;
}

export function createLogger({
  level = "info",
  write = (line) => process.stdout.write(line),
  now = () => new Date(),
  base = {},
} = {}) {
  if (!Object.hasOwn(LEVELS, level)) {
    throw new TypeError("Неизвестный уровень логирования.");
  }
  if (typeof write !== "function" || typeof now !== "function") {
    throw new TypeError("write и now должны быть функциями.");
  }

  function log(currentLevel, event, fields = {}) {
    if (LEVELS[currentLevel] < LEVELS[level]) return;
    const record = sanitize({
      ...base,
      ...fields,
      timestamp: now().toISOString(),
      level: currentLevel,
      event: String(event),
    });
    write(JSON.stringify(record) + "\n");
  }

  return {
    debug: (event, fields) => log("debug", event, fields),
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, fields) => log("error", event, fields),
  };
}

export function requestLogger({ logger = createLogger() } = {}) {
  if (!logger || typeof logger.info !== "function") {
    throw new TypeError("requestLogger требует logger.info.");
  }

  return (req, res, next) => {
    const requestId = randomUUID();
    const started = process.hrtime.bigint();
    res.setHeader("X-Request-Id", requestId);

    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      logger.info("http.request", {
        requestId,
        method: req.method,
        path: req.originalUrl?.split("?")[0] ?? req.path,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(3)),
      });
    });

    next();
  };
}
