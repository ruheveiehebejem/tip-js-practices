import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "README.md",
  "CHANGELOG.md",
  "Dockerfile",
  "compose.yaml",
  ".env.example",
  "docs/OPERATIONS.md",
  "docs/DEMO.md",
  "sql/01_schema.sql",
  "sql/02_seed.sql",
  "src/config.js",
  "src/health.js",
  "src/logger.js",
  "src/lifecycle.js",
  "tests/integration/variant-8.test.js",
];

for (const relative of required) {
  await access(path.join(root, relative));
}

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const changelog = await readFile(path.join(root, "CHANGELOG.md"), "utf8");
if (!/^\d+\.\d+\.\d+/.test(pkg.version)) {
  throw new Error("package.json must contain a semantic release version.");
}
if (!changelog.includes(pkg.version)) {
  throw new Error("CHANGELOG.md does not contain the package release version.");
}

process.stdout.write(`Release files are present for version ${pkg.version}.\n`);
