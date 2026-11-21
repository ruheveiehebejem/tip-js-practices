import assert from "node:assert/strict";
import test from "node:test";
import { createShutdown } from "../../src/lifecycle.js";

test("shutdown closes HTTP server before the database pool", async () => {
  const calls = [];
  const server = {
    close(callback) {
      calls.push("server.close");
      callback();
    },
  };
  const pool = {
    async end() { calls.push("pool.end"); },
  };
  const shutdown = createShutdown({ server, pool, timeoutMs: 1000 });
  await shutdown("SIGTERM");
  assert.deepEqual(calls, ["server.close", "pool.end"]);
});

test("shutdown is idempotent and returns the same promise", async () => {
  let closes = 0;
  const server = {
    close(callback) {
      closes += 1;
      setImmediate(callback);
    },
  };
  const pool = { async end() {} };
  const shutdown = createShutdown({ server, pool, timeoutMs: 1000 });
  const first = shutdown("SIGINT");
  const second = shutdown("SIGTERM");
  assert.equal(first, second);
  await first;
  assert.equal(closes, 1);
});

test("shutdown rejects when graceful close exceeds timeout", async () => {
  const server = { close() {} };
  const pool = { async end() {} };
  const shutdown = createShutdown({ server, pool, timeoutMs: 15 });
  await assert.rejects(shutdown(), /Тайм-аут graceful shutdown/);
});
