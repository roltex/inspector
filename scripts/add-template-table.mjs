/**
 * One-shot helper that adds the `inspection_item_template` table to the
 * local PGlite database without re-running the full Drizzle baseline.
 * Idempotent: safe to run multiple times.
 *
 * Usage:  node scripts/add-template-table.mjs
 */
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";

const SQL = [
  `CREATE TABLE IF NOT EXISTS "inspection_item_template" (
     "id" text PRIMARY KEY NOT NULL,
     "organization_id" text REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "description" text,
     "category_name" text,
     "fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
     "auto_seed" boolean NOT NULL DEFAULT false,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   );`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_template_org_idx"
     ON "inspection_item_template" ("organization_id");`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_template_auto_seed_idx"
     ON "inspection_item_template" ("auto_seed");`,
];

async function main() {
  if (!url || url.startsWith("file:") || url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir =
      url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") || "./.pglite";
    const client = new PGlite(dataDir);
    console.log(`→ PGlite at ${dataDir}`);
    for (const stmt of SQL) {
      await client.exec(stmt);
    }
    await client.close();
  } else {
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    console.log("→ Postgres");
    for (const stmt of SQL) {
      await client.unsafe(stmt);
    }
    await client.end();
  }
  console.log("✅ inspection_item_template table is ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
