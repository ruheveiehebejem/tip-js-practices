import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../../src/app.js";
import { createFakeStore } from "../support/fake-store.js";
import { request, startServer } from "../support/http.js";

async function withApp(store, callback) {
  const running = await startServer(createApp({ store, releaseVersion: "1.4.0" }));
  try { await callback(running.origin); }
  finally { await running.close(); }
}

test("liveness отвечает без обращения к базе", async () => {
  const store = createFakeStore();
  let pingCount = 0;
  store.ping = async () => { pingCount += 1; return true; };
  await withApp(store, async (origin) => {
    const result = await request(origin, "/health/live");
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, { status: "ok" });
    assert.equal(pingCount, 0);
  });
});

test("readiness сообщает connected и версию релиза", async () => {
  const store = createFakeStore();
  store.ping = async () => true;
  await withApp(store, async (origin) => {
    const result = await request(origin, "/health/ready");
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, {
      status: "ok",
      database: "connected",
      version: "1.4.0",
    });
  });
});

test("readiness возвращает 503 без раскрытия подробностей БД", async () => {
  const store = createFakeStore();
  store.ping = async () => { throw new Error("private-db-password"); };
  await withApp(store, async (origin) => {
    const result = await request(origin, "/health/ready");
    assert.equal(result.response.status, 503);
    assert.deepEqual(result.body, { status: "error", database: "unavailable" });
    assert.doesNotMatch(JSON.stringify(result.body), /private-db-password/);
  });
});
