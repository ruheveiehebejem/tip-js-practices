import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString = process.env.DATABASE_URL;

if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is required. Load your local .env first.");
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 3000,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const file of ["sql/01_schema.sql", "sql/02_seed.sql"]) {
    const sql = await readFile(path.join(root, file), "utf8");
    await client.query(sql);
    process.stdout.write(`Applied ${file}\n`);
  }
  await client.query("COMMIT");
  const result = await client.query(
    "SELECT (SELECT count(*)::int FROM public.categories) AS categories, " +
    "(SELECT count(*)::int FROM public.tasks) AS tasks",
  );
  process.stdout.write(JSON.stringify(result.rows[0]) + "\n");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  process.stderr.write("Database preparation failed: " + error.message + "\n");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
