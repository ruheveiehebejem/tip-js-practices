import assert from "node:assert/strict";
import test from "node:test";
import { createLogger, requestLogger } from "../../src/logger.js";
import { EventEmitter } from "node:events";

test("logger writes one structured JSON record per line", () => {
  const lines = [];
  const logger = createLogger({
    level: "debug",
    now: () => new Date("2026-01-02T03:04:05.000Z"),
    write: (line) => lines.push(line),
  });
  logger.info("test.event", { count: 2 });
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.equal(record.timestamp, "2026-01-02T03:04:05.000Z");
  assert.equal(record.level, "info");
  assert.equal(record.event, "test.event");
  assert.equal(record.count, 2);
});

test("logger filters records below configured level", () => {
  const lines = [];
  const logger = createLogger({ level: "warn", write: (line) => lines.push(line) });
  logger.debug("debug");
  logger.info("info");
  logger.warn("warn");
  logger.error("error");
  assert.equal(lines.length, 2);
});

test("logger redacts sensitive properties recursively", () => {
  const lines = [];
  const logger = createLogger({ write: (line) => lines.push(line) });
  logger.info("credentials.checked", {
    password: "do-not-print",
    nested: { authorization: "Bearer secret", safe: "visible" },
    DATABASE_URL: "postgresql://user:password@host/db",
  });
  const line = lines[0];
  assert.doesNotMatch(line, /do-not-print|Bearer secret|postgresql:\/\//);
  const data = JSON.parse(line);
  assert.equal(data.password, "[REDACTED]");
  assert.equal(data.nested.authorization, "[REDACTED]");
  assert.equal(data.nested.safe, "visible");
});

test("requestLogger adds request id and records response metadata", async () => {
  const lines = [];
  const logger = createLogger({ write: (line) => lines.push(line) });
  let nextCalled = false;
  const req = { method: "GET", originalUrl: "/api/tasks?q=hidden", path: "/api/tasks" };
  const headers = {};
  const res = new EventEmitter();
  res.setHeader = (name, value) => { headers[name] = value; };
  res.statusCode = 200;

  requestLogger({ logger })(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.ok(headers["X-Request-Id"]);
  res.emit("finish");

  const record = JSON.parse(lines[0]);
  assert.equal(record.event, "http.request");
  assert.equal(record.method, "GET");
  assert.equal(record.path, "/api/tasks");
  assert.equal(record.statusCode, 200);
  assert.equal(record.requestId, headers["X-Request-Id"]);
});
