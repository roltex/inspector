/**
 * One-shot helper that brings the local PGlite database in line with the
 * "risk directory" schema:
 *
 *   - Creates the `risk_level` table (user-defined risk labels).
 *   - Ensures `risk_sector` exists, has `risk_level_id` FK, and drops the
 *     legacy `default_risk` column if it's still there.
 *   - Moves the `risk_sector_id` FK from `company` → `company_object`.
 *
 * Every statement is idempotent: safe to re-run. Mirrors the pattern of
 * `scripts/add-template-table.mjs`.
 *
 * Usage:  node scripts/apply-risk-directory.mjs
 */
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";

const SQL = [
  /* -------------------------------------------------------------------- */
  /*  risk_level                                                           */
  /* -------------------------------------------------------------------- */
  `CREATE TABLE IF NOT EXISTS "risk_level" (
     "id" text PRIMARY KEY NOT NULL,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "code" text,
     "description" text,
     "tone" text NOT NULL DEFAULT 'muted',
     "score" integer NOT NULL DEFAULT 0,
     "sort_order" integer NOT NULL DEFAULT 0,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   );`,
  `CREATE INDEX IF NOT EXISTS "risk_level_org_idx"
     ON "risk_level" ("organization_id");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "risk_level_org_name_idx"
     ON "risk_level" ("organization_id", "name");`,

  /* -------------------------------------------------------------------- */
  /*  risk_sector (create if missing, plus backfill the new columns)       */
  /* -------------------------------------------------------------------- */
  `CREATE TABLE IF NOT EXISTS "risk_sector" (
     "id" text PRIMARY KEY NOT NULL,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "code" text,
     "description" text,
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
  // Add the risk_level_id FK column if it doesn't exist yet.
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'risk_sector'
          AND column_name = 'risk_level_id'
     ) THEN
       ALTER TABLE "risk_sector"
         ADD COLUMN "risk_level_id" text
         REFERENCES "risk_level"("id") ON DELETE SET NULL;
     END IF;
   END
   $$;`,
  `CREATE INDEX IF NOT EXISTS "risk_sector_level_idx"
     ON "risk_sector" ("risk_level_id");`,
  // Drop the legacy `default_risk` column if the previous shape left it
  // behind. It's safe — the new schema doesn't reference it.
  `ALTER TABLE "risk_sector" DROP COLUMN IF EXISTS "default_risk";`,

  /* -------------------------------------------------------------------- */
  /*  company → drop risk_sector_id                                        */
  /* -------------------------------------------------------------------- */
  // Drop any legacy FK constraint first so the column itself can go.
  `ALTER TABLE "company"
     DROP CONSTRAINT IF EXISTS "company_risk_sector_id_risk_sector_id_fk";`,
  `DROP INDEX IF EXISTS "company_risk_sector_idx";`,
  `ALTER TABLE "company" DROP COLUMN IF EXISTS "risk_sector_id";`,

  /* -------------------------------------------------------------------- */
  /*  company_object → add risk_sector_id                                  */
  /* -------------------------------------------------------------------- */
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'company_object'
          AND column_name = 'risk_sector_id'
     ) THEN
       ALTER TABLE "company_object"
         ADD COLUMN "risk_sector_id" text
         REFERENCES "risk_sector"("id") ON DELETE SET NULL;
     END IF;
   END
   $$;`,
  `CREATE INDEX IF NOT EXISTS "company_object_risk_sector_idx"
     ON "company_object" ("risk_sector_id");`,
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
  console.log("✅ Risk directory (risk_level + risk_sector on objects) ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
