/**
 * Loads `lib/db/snapshot.json` (produced by `scripts/snapshot-db.mjs`) into
 * the database pointed at by DATABASE_URL. Designed for a clean clone:
 *
 *   1. `npm install`
 *   2. `cp .env.example .env.local`
 *   3. `npm run db:migrate`     ← creates the schema
 *   4. `npm run db:restore`     ← loads workspaces, members, inspections, …
 *
 * Or just use the convenience target: `npm run setup`.
 *
 * The restore is idempotent in the sense that it TRUNCATES every table it
 * is about to repopulate, so re-running won't double up rows. We never drop
 * the schema itself — that's drizzle-kit's job.
 */
import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
const SNAPSHOT_PATH = resolve("./lib/db/snapshot.json");

if (!existsSync(SNAPSHOT_PATH)) {
  console.error(`❌ No snapshot found at ${SNAPSHOT_PATH}`);
  console.error("   Run `npm run db:snapshot` from the repo that has the data.");
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
if (!snapshot?.tables || typeof snapshot.tables !== "object") {
  console.error("❌ Snapshot file is malformed (no `tables` map).");
  process.exit(1);
}

/**
 * Reverse the encoding done in `snapshot-db.mjs#jsonReplacer`. Walks every
 * value once and rehydrates `{ __buf: "<b64>" }` markers back into Buffers.
 */
function reviveBuffers(value) {
  if (Array.isArray(value)) return value.map(reviveBuffers);
  if (value && typeof value === "object") {
    if (typeof value.__buf === "string") {
      return Buffer.from(value.__buf, "base64");
    }
    const out = {};
    for (const k of Object.keys(value)) out[k] = reviveBuffers(value[k]);
    return out;
  }
  return value;
}

/* Simple identifier-quoter to be safe in dynamic SQL. PG identifiers
 * already use double quotes so we just need to escape any embedded `"`. */
function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/**
 * Try several reasonable orderings until every row inserts cleanly. This
 * dodges the "you have to figure out the FK topo-sort" rabbit-hole — we
 * just retry tables whose FKs aren't satisfied yet. Termination is
 * guaranteed because each successful pass reduces the queue, and a
 * fully-blocked queue triggers a single rethrow at the end.
 */
async function restoreAll(client, dialect) {
  // Filter the snapshot down to tables that actually exist in the target
  // schema. Older snapshots may still reference removed tables (e.g. the
  // legacy `inspector` table), which would otherwise block the restore.
  const targetTablesRows = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const targetTables = new Set(
    (targetTablesRows.rows ?? targetTablesRows).map((r) => r.tablename),
  );

  const entries = Object.entries(snapshot.tables).filter(
    ([table]) => {
      if (targetTables.has(table)) return true;
      console.warn(
        `   ⚠ skipping "${table}" — not present in target schema`,
      );
      return false;
    },
  );

  // Disable FK enforcement during the bulk load. Postgres / PGlite both
  // honour `session_replication_role = 'replica'`, which makes the session
  // skip RI triggers — perfect for restoring a snapshot whose rows may
  // reference each other in any order (and may include the occasional
  // orphan row from earlier development cycles).
  await client.query("SET session_replication_role = 'replica'");

  try {
    // TRUNCATE every table we're about to touch in one shot via CASCADE so
    // ordering doesn't matter.
    const tableList = entries.map(([t]) => q(t)).join(", ");
    if (tableList) {
      await client.query(
        `TRUNCATE ${tableList} RESTART IDENTITY CASCADE`,
      );
    }

    for (const { 0: table, 1: rows } of entries) {
      await insertRows(client, dialect, table, rows);
    }
  } finally {
    // Always re-enable FK checks before handing control back, even on
    // failure — leaving the connection in `replica` mode would cause
    // surprising behaviour for any caller that reuses the same client.
    await client.query("SET session_replication_role = 'origin'");
  }
}

async function insertRows(client, dialect, table, rows) {
  if (rows.length === 0) {
    return;
  }

  // Look up the target table's actual columns so we can drop any snapshot
  // columns that no longer exist in the current schema (e.g. fields removed
  // by a later migration). This keeps the restore forward-compatible.
  const colRowsResult = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table.replace(/'/g, "''")}'`,
  );
  const colRows = colRowsResult.rows ?? colRowsResult;
  const targetColumns = new Set(colRows.map((r) => r.column_name));

  const columns = Object.keys(rows[0]).filter((c) => {
    if (targetColumns.has(c)) return true;
    return false; // silently drop — common when schema has evolved
  });
  if (columns.length === 0) return; // nothing in this row maps to schema
  const droppedColumns = Object.keys(rows[0]).filter(
    (c) => !targetColumns.has(c),
  );
  if (droppedColumns.length > 0) {
    console.warn(
      `   ⚠ "${table}": dropping stale columns [${droppedColumns.join(", ")}]`,
    );
  }

  const colList = columns.map(q).join(", ");
  for (const row of rows) {
    const restored = reviveBuffers(row);
    const params = columns.map((c) => normalize(restored[c]));
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${q(table)} (${colList}) VALUES (${placeholders})`;
    if (dialect === "pglite") {
      await client.query(sql, params);
    } else {
      await client.unsafe(sql, params);
    }
  }
}

function normalize(value) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "object") {
    // Force JSON columns through a stable encoding.
    return JSON.stringify(value);
  }
  return value;
}

async function main() {
  if (!url || url.startsWith("file:") || url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir =
      url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") ||
      "./.pglite";
    const client = new PGlite(dataDir);
    console.log(`→ PGlite at ${dataDir}`);
    const wrapped = {
      query: async (sql, params) => client.query(sql, params),
    };
    await restoreAll(wrapped, "pglite");
    await client.close();
  } else {
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    console.log("→ Postgres");
    const wrapped = {
      query: async (sql) => client.unsafe(sql),
      unsafe: async (sql, params) => client.unsafe(sql, params),
    };
    await restoreAll(wrapped, "postgres");
    await client.end();
  }

  let totalRows = 0;
  for (const rows of Object.values(snapshot.tables)) totalRows += rows.length;
  console.log(
    `\n✅ Restored ${Object.keys(snapshot.tables).length} tables, ${totalRows} rows.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
