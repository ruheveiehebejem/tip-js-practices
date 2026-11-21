import assert from "node:assert/strict";
import test from "node:test";
import { readConfig } from "../../src/config.js";

const base = { DATABASE_URL: "postgresql://user:pass@localhost:5432/tasks" };

test("readConfig reads complete release configuration", () => {
  const config = readConfig({
    ...base,
    API_HOST: "0.0.0.0",
    API_PORT: "5600",
    NODE_ENV: "production",
    LOG_LEVEL: "warn",
    RELEASE_VERSION: "1.2.3",
    ENABLE_DEBUG_RESET: "false",
    JSON_BODY_LIMIT_BYTES: "32768",
  });
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 5600);
  assert.equal(config.nodeEnv, "production");
  assert.equal(config.logLevel, "warn");
  assert.equal(config.releaseVersion, "1.2.3");
  assert.equal(config.jsonBodyLimitBytes, 32768);
  assert.equal(config.enableDebugReset, false);
});

test("readConfig supplies safe defaults", () => {
  const config = readConfig(base);
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 5505);
  assert.equal(config.nodeEnv, "development");
  assert.equal(config.logLevel, "info");
  assert.equal(config.releaseVersion, "1.0.0");
  assert.equal(config.jsonBodyLimitBytes, 16384);
  assert.equal(config.enableDebugReset, false);
});

test("readConfig rejects invalid release values", () => {
  assert.throws(() => readConfig({}), /DATABASE_URL/);
  assert.throws(() => readConfig({ ...base, API_HOST: "bad host" }), /API_HOST/);
  assert.throws(() => readConfig({ ...base, NODE_ENV: "staging" }), /NODE_ENV/);
  assert.throws(() => readConfig({ ...base, LOG_LEVEL: "verbose" }), /LOG_LEVEL/);
  assert.throws(() => readConfig({ ...base, RELEASE_VERSION: "release-1" }), /RELEASE_VERSION/);
});

test("readConfig rejects invalid JSON body limits", () => {
  for (const value of ["abc", "0", "1023", "1048577", "1.5"]) {
    assert.throws(
      () => readConfig({ ...base, JSON_BODY_LIMIT_BYTES: value }),
      /JSON_BODY_LIMIT_BYTES/,
    );
  }
  assert.equal(readConfig({ ...base, JSON_BODY_LIMIT_BYTES: "1024" }).jsonBodyLimitBytes, 1024);
  assert.equal(readConfig({ ...base, JSON_BODY_LIMIT_BYTES: "1048576" }).jsonBodyLimitBytes, 1048576);
});

test("readConfig rejects debug reset in production", () => {
  assert.throws(
    () => readConfig({ ...base, NODE_ENV: "production", ENABLE_DEBUG_RESET: "true" }),
    /production/,
  );
});
