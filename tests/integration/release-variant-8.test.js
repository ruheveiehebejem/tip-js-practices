import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../../src/app.js";
import { createFakeStore } from "../support/fake-store.js";
import { request, startServer } from "../support/http.js";

test("Вариант 8 ПР14: превышение лимита JSON возвращает HTTP 413", async () => {
  const running = await startServer(
    createApp({
      store: createFakeStore(),
      jsonBodyLimitBytes: 1024,
    }),
  );

  try {
    const body = JSON.stringify({
      title: "Техническая документация ".repeat(100),
      priority: "high",
      categoryId: 2,
    });

    assert.ok(Buffer.byteLength(body, "utf8") > 1024);

    const answer = await request(running.origin, "/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    assert.equal(answer.response.status, 413);
    assert.equal(answer.body.error.code, "PAYLOAD_TOO_LARGE");
    assert.match(answer.body.error.message, /лимит/i);
  } finally {
    await running.close();
  }
});
