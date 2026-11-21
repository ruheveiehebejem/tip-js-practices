const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5505").replace(/\/+$/, "");

async function check(path, expectedStatus = 200) {
  const response = await fetch(baseUrl + path, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected HTTP ${expectedStatus}, received ${response.status}: ${text}`);
  }
  let body = null;
  if (text !== "") {
    try { body = JSON.parse(text); }
    catch { throw new Error(`${path}: response is not valid JSON.`); }
  }
  return { response, body };
}

const live = await check("/health/live");
if (live.body?.status !== "ok") throw new Error("Liveness response is invalid.");

const ready = await check("/health/ready");
if (ready.body?.database !== "connected") throw new Error("Readiness response is invalid.");

const health = await check("/api/health");
if (health.body?.data?.database !== "connected") throw new Error("API health response is invalid.");

const categories = await check("/api/categories");
if (categories.body?.meta?.total !== 3) throw new Error("Expected three categories.");

const tasks = await check("/api/tasks");
if (tasks.body?.meta?.total !== 12) throw new Error("Expected twelve seeded tasks.");

const variant = await check("/api/tasks?completed=false&priority=high&categoryId=2");
const ids = variant.body?.data?.map((task) => task.id);
if (JSON.stringify(ids) !== JSON.stringify([4, 34])) {
  throw new Error("Variant 8 filter returned unexpected task IDs: " + JSON.stringify(ids));
}

process.stdout.write("Smoke checks passed: liveness, readiness, health, categories, tasks, variant 8.\n");
