/**
 * Dumps every user table from the current database (PGlite or Postgres) into
 * a single JSON file at `lib/db/snapshot.json`. The file is committed to git
 * so a fresh clone of the repo can run `npm run setup` and end up with the
 * exact same workspaces, members, inspections, templates, etc.
 *
 * Usage:  node scripts/snapshot-db.mjs
 *
 * Requirements:
 *   - The database must contain the schema (run `npm run db:migrate` first
 *     if you don't already have one).
 *   - The dev server must be stopped while running against PGlite — PGlite
 *     is single-process and refuses concurrent connections.
 */
import { config } from "dotenv";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
const OUT_FILE = resolve("./lib/db/snapshot.json");

// Tables we *don't* want to persist between clones — these are session /
// runtime artifacts that any user must produce on their own machine.
const SKIP_TABLES = new Set([
  "session", // Better Auth session rows (cookie-bound)
  "verification", // one-time verification tokens
  "__drizzle_migrations", // bookkeeping populated by drizzle-kit
]);

async function listUserTables(query) {
  const rows = await query(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
   ORDER BY tablename;`,
  );
  return rows.map((r) => r.tablename).filter((t) => !SKIP_TABLES.has(t));
}

async function dumpTable(query, table) {
  const rows = await query(`SELECT * FROM "${table}";`);
  return rows;
}

async function main() {
  let query;
  let close;

  if (!url || url.startsWith("file:") || url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir =
      url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") ||
      "./.pglite";
    const client = new PGlite(dataDir);
    query = async (sql) => (await client.query(sql)).rows;
    close = () => client.close();
    console.log(`→ PGlite at ${dataDir}`);
  } else {
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    query = async (sql) => client.unsafe(sql);
    close = () => client.end();
    console.log("→ Postgres");
  }

  const tables = await listUserTables(query);
  const snapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    tables: {},
  };

  let totalRows = 0;
  for (const table of tables) {
    const rows = await dumpTable(query, table);
    snapshot.tables[table] = rows;
    totalRows += rows.length;
    console.log(`   ${table.padEnd(36)} ${String(rows.length).padStart(5)} rows`);
  }

  await close();

  if (!existsSync(dirname(OUT_FILE))) {
    mkdirSync(dirname(OUT_FILE), { recursive: true });
  }
  writeFileSync(
    OUT_FILE,
    JSON.stringify(snapshot, jsonReplacer, 2),
    "utf8",
  );

  console.log(
    `\n✅ Snapshot written to ${OUT_FILE} (${tables.length} tables, ${totalRows} rows)`,
  );
}

/**
 * JSON.stringify replacer that survives common driver-specific value types:
 *   - Buffer → base64 + sentinel
 *   - Date   → ISO string
 *   - bigint → string
 */
function jsonReplacer(_key, value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (value && typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
    return { __buf: Buffer.from(value.data).toString("base64") };
  }
  if (Buffer?.isBuffer?.(value)) {
    return { __buf: value.toString("base64") };
  }
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
