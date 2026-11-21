const ALLOWED_ENVIRONMENTS = new Set(["development", "test", "production"]);
const ALLOWED_LEVELS = new Set(["debug", "info", "warn", "error"]);
const RELEASE_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function parsePort(raw) {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new Error("API_PORT должен быть целым числом от 1024 до 65535.");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1024 || value > 65535) {
    throw new Error("API_PORT должен быть целым числом от 1024 до 65535.");
  }
  return value;
}

function requiredText(env, key, fallback) {
  const value = env[key] === undefined ? fallback : env[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(key + " не должен быть пустым или состоять из пробелов.");
  }
  return value.trim();
}

function parseBodyLimit(raw) {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new Error("JSON_BODY_LIMIT_BYTES должен быть целым числом от 1024 до 1048576.");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1024 || value > 1048576) {
    throw new Error("JSON_BODY_LIMIT_BYTES должен быть целым числом от 1024 до 1048576.");
  }
  return value;
}

export function readConfig(env = process.env) {
  const connectionString = requiredText(env, "DATABASE_URL", "");
  const host = requiredText(env, "API_HOST", "127.0.0.1");
  if (/\s/.test(host)) {
    throw new Error("API_HOST не должен содержать пробельные символы.");
  }

  const nodeEnv = requiredText(env, "NODE_ENV", "development");
  if (!ALLOWED_ENVIRONMENTS.has(nodeEnv)) {
    throw new Error("NODE_ENV должен быть development, test или production.");
  }

  const logLevel = requiredText(env, "LOG_LEVEL", "info");
  if (!ALLOWED_LEVELS.has(logLevel)) {
    throw new Error("LOG_LEVEL должен быть debug, info, warn или error.");
  }

  const releaseVersion = requiredText(env, "RELEASE_VERSION", "1.0.0");
  if (!RELEASE_PATTERN.test(releaseVersion)) {
    throw new Error("RELEASE_VERSION должен иметь формат semver.");
  }

  let enableDebugReset;
  if (env.ENABLE_DEBUG_RESET === undefined) {
    enableDebugReset = false;
  } else if (env.ENABLE_DEBUG_RESET === "true") {
    enableDebugReset = true;
  } else if (env.ENABLE_DEBUG_RESET === "false") {
    enableDebugReset = false;
  } else {
    throw new Error("ENABLE_DEBUG_RESET должен быть true или false.");
  }

  if (nodeEnv === "production" && enableDebugReset) {
    throw new Error("ENABLE_DEBUG_RESET запрещён в production.");
  }

  return {
    host,
    port: parsePort(env.API_PORT ?? "5505"),
    connectionString,
    nodeEnv,
    logLevel,
    releaseVersion,
    jsonBodyLimitBytes: parseBodyLimit(env.JSON_BODY_LIMIT_BYTES ?? "16384"),
    enableDebugReset,
  };
}
