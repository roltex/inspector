/**
 * One-shot helper that adds the `risk_sector` table and the
 * `company.risk_sector_id` foreign key to the local PGlite database.
 * Idempotent: safe to re-run. Mirrors the pattern of
 * `scripts/add-template-table.mjs`.
 *
 * Usage:  node scripts/add-risk-sector.mjs
 */
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";

const SQL = [
  `CREATE TABLE IF NOT EXISTS "risk_sector" (
     "id" text PRIMARY KEY NOT NULL,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "code" text,
     "description" text,
     "default_risk" "severity" NOT NULL DEFAULT 'MEDIUM',
     "color" text,
     "sort_order" integer NOT NULL DEFAULT 0,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   );`,
  `CREATE INDEX IF NOT EXISTS "risk_sector_org_idx"
     ON "risk_sector" ("organization_id");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "risk_sector_org_name_idx"
     ON "risk_sector" ("organization_id", "name");`,
  // Add the FK column on `company` only if it doesn't exist yet.
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'company'
          AND column_name = 'risk_sector_id'
     ) THEN
       ALTER TABLE "company"
         ADD COLUMN "risk_sector_id" text
         REFERENCES "risk_sector"("id") ON DELETE SET NULL;
     END IF;
   END
   $$;`,
  `CREATE INDEX IF NOT EXISTS "company_risk_sector_idx"
     ON "company" ("risk_sector_id");`,
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
  console.log("✅ risk_sector table + company FK ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
