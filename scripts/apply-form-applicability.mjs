/**
 * One-shot helper that brings the local PGlite database in line with the
 * "inspection-form applicability" schema:
 *
 *   - Drops `risk_sector.risk_level_id` (and its constraint / index) —
 *     the baseline-risk relation no longer lives on the inspect item.
 *   - Creates the `inspection_item_applicability` join table that links
 *     each inspection form to (inspect-item × risk-level) pairs.
 *
 * Every statement is idempotent: safe to re-run. Mirrors the pattern of
 * `scripts/apply-risk-directory.mjs`.
 *
 * Usage:  node scripts/apply-form-applicability.mjs
 */
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";

const SQL = [
  /* -------------------------------------------------------------------- */
  /*  risk_sector → drop risk_level_id                                     */
  /* -------------------------------------------------------------------- */
  `ALTER TABLE "risk_sector"
     DROP CONSTRAINT IF EXISTS "risk_sector_risk_level_id_risk_level_id_fk";`,
  `DROP INDEX IF EXISTS "risk_sector_level_idx";`,
  `ALTER TABLE "risk_sector" DROP COLUMN IF EXISTS "risk_level_id";`,

  /* -------------------------------------------------------------------- */
  /*  inspection_item_applicability                                        */
  /* -------------------------------------------------------------------- */
  `CREATE TABLE IF NOT EXISTS "inspection_item_applicability" (
     "id" text PRIMARY KEY NOT NULL,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "inspection_item_id" text NOT NULL REFERENCES "inspection_item"("id") ON DELETE CASCADE,
     "risk_sector_id" text NOT NULL REFERENCES "risk_sector"("id") ON DELETE CASCADE,
     "risk_level_id" text NOT NULL REFERENCES "risk_level"("id") ON DELETE CASCADE,
     "created_at" timestamp NOT NULL DEFAULT now()
   );`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_applicability_org_idx"
     ON "inspection_item_applicability" ("organization_id");`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_applicability_item_idx"
     ON "inspection_item_applicability" ("inspection_item_id");`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_applicability_sector_idx"
     ON "inspection_item_applicability" ("risk_sector_id");`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_applicability_level_idx"
     ON "inspection_item_applicability" ("risk_level_id");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "inspection_item_applicability_unique_triple"
     ON "inspection_item_applicability"
     ("inspection_item_id", "risk_sector_id", "risk_level_id");`,
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
  console.log("✅ Applicability join + risk_sector cleanup done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
