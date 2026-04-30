// Targeted migration for the platform admin panel: adds the new columns and the
// `app_setting` table to whatever Postgres-compatible store is currently in use
// (PGlite locally, real Postgres in production). Idempotent: safe to run twice.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
const isPglite = !url || url.startsWith("file:") || url.startsWith("pglite:");

const PLAN_SEEDS = [
  {
    id: "FREE",
    name: "Free",
    tagline: "For small teams exploring safer operations.",
    priceMonthly: 0,
    priceYearly: 0,
    userLimit: 5,
    storageLimitGb: 1,
    features: ["inspections", "observations"],
    highlights: [
      "Up to 5 users",
      "Inspections & Observations",
      "Mobile PWA access",
      "Email support",
    ],
    cta: "Get started",
    popular: false,
    displayOrder: 1,
  },
  {
    id: "STARTER",
    name: "Starter",
    tagline: "For operating teams replacing paper and spreadsheets.",
    priceMonthly: 29,
    priceYearly: 290,
    userLimit: 25,
    storageLimitGb: 10,
    features: ["inspections", "observations", "incidents", "capa", "documents"],
    highlights: [
      "Up to 25 users",
      "Everything in Free, plus",
      "Incident reporting & CAPA",
      "Document library",
      "Standard analytics",
    ],
    cta: "Start 14-day trial",
    popular: false,
    displayOrder: 2,
  },
  {
    id: "PRO",
    name: "Professional",
    tagline: "The complete EHS suite for growing organizations.",
    priceMonthly: 99,
    priceYearly: 990,
    userLimit: 100,
    storageLimitGb: 100,
    features: [
      "inspections", "observations", "incidents", "capa", "risk",
      "documents", "training", "chemicals", "ppe", "permits",
      "compliance", "contractors", "analytics", "web_push",
    ],
    highlights: [
      "Up to 100 users",
      "All 13 EHS modules",
      "Advanced analytics & KPIs",
      "Permit to Work workflows",
      "Web push & reminders",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    popular: true,
    displayOrder: 3,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Security, SSO and scale for regulated industries.",
    priceMonthly: null,
    priceYearly: null,
    userLimit: 10000,
    storageLimitGb: 1000,
    features: [
      "inspections", "observations", "incidents", "capa", "risk",
      "documents", "training", "chemicals", "ppe", "permits",
      "compliance", "contractors", "analytics", "web_push",
      "sso", "audit_export",
    ],
    highlights: [
      "Unlimited users",
      "SSO (SAML, OIDC)",
      "Custom retention & audit export",
      "Dedicated CSM",
      "SLA & DPA",
    ],
    cta: "Contact sales",
    popular: false,
    displayOrder: 4,
  },
];

const STATEMENTS = [
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "super_admin" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned_at" timestamp`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locale" text`,
  `ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonated_by" text`,
  `ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp`,
  `ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "suspended_reason" text`,
  `CREATE TABLE IF NOT EXISTS "app_setting" (
     "key" text PRIMARY KEY,
     "value" jsonb,
     "updated_at" timestamp NOT NULL DEFAULT now(),
     "updated_by" text REFERENCES "user"("id") ON DELETE SET NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "plan_definition" (
     "id" "plan" PRIMARY KEY,
     "name" text NOT NULL,
     "tagline" text NOT NULL DEFAULT '',
     "price_monthly" integer,
     "price_yearly" integer,
     "currency" text NOT NULL DEFAULT 'USD',
     "user_limit" integer NOT NULL DEFAULT 5,
     "storage_limit_gb" integer NOT NULL DEFAULT 1,
     "features" jsonb NOT NULL DEFAULT '[]'::jsonb,
     "highlights" jsonb NOT NULL DEFAULT '[]'::jsonb,
     "cta" text,
     "popular" boolean NOT NULL DEFAULT false,
     "is_public" boolean NOT NULL DEFAULT true,
     "is_archived" boolean NOT NULL DEFAULT false,
     "display_order" integer NOT NULL DEFAULT 0,
     "updated_at" timestamp NOT NULL DEFAULT now(),
     "updated_by" text REFERENCES "user"("id") ON DELETE SET NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "company" (
     "id" text PRIMARY KEY,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "code" text,
     "contact_name" text,
     "contact_email" text,
     "contact_phone" text,
     "address" text,
     "notes" text,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "company_org_idx" ON "company" ("organization_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "company_org_name_idx" ON "company" ("organization_id", "name")`,
  `CREATE TABLE IF NOT EXISTS "company_object" (
     "id" text PRIMARY KEY,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "company_id" text NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "code" text,
     "type" text,
     "address" text,
     "city" text,
     "country" text,
     "manager_name" text,
     "manager_email" text,
     "manager_phone" text,
     "notes" text,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "company_object_org_idx" ON "company_object" ("organization_id")`,
  `CREATE INDEX IF NOT EXISTS "company_object_company_idx" ON "company_object" ("company_id")`,
  `CREATE TABLE IF NOT EXISTS "inspection_item" (
     "id" text PRIMARY KEY,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "description" text,
     "category" text NOT NULL DEFAULT 'General',
     "sort_order" integer NOT NULL DEFAULT 0,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_org_idx" ON "inspection_item" ("organization_id")`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_org_category_idx" ON "inspection_item" ("organization_id", "category", "sort_order")`,
  // ---- Inspection item categories (per-workspace, related list) ----
  `CREATE TABLE IF NOT EXISTS "inspection_item_category" (
     "id" text PRIMARY KEY,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "description" text,
     "color" text,
     "sort_order" integer NOT NULL DEFAULT 0,
     "is_active" boolean NOT NULL DEFAULT true,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_category_org_idx" ON "inspection_item_category" ("organization_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "inspection_item_category_org_name_idx" ON "inspection_item_category" ("organization_id", "name")`,
  // FK column on inspection_item
  `ALTER TABLE "inspection_item" ADD COLUMN IF NOT EXISTS "category_id" text REFERENCES "inspection_item_category"("id") ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_org_category_id_idx" ON "inspection_item" ("organization_id", "category_id")`,
  // Backfill: create one category row per distinct (org, free-text category)
  // currently used by inspection_item rows. Idempotent thanks to the unique
  // index — re-runs are no-ops.
  `INSERT INTO "inspection_item_category" ("id", "organization_id", "name")
     SELECT
       'iic_' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 16)) || '_' || substr(md5(ii."organization_id" || ii."category"), 1, 8),
       ii."organization_id",
       ii."category"
     FROM (
       SELECT DISTINCT "organization_id", COALESCE(NULLIF("category", ''), 'General') AS "category"
       FROM "inspection_item"
     ) ii
     ON CONFLICT ("organization_id", "name") DO NOTHING`,
  // Link inspection_item rows to their corresponding category row.
  `UPDATE "inspection_item" ii
     SET "category_id" = c."id"
     FROM "inspection_item_category" c
     WHERE c."organization_id" = ii."organization_id"
       AND c."name" = ii."category"
       AND ii."category_id" IS NULL`,
  // Make sure every workspace has at least a "General" seed so the picker
  // always has at least one option (helpful for fresh orgs created earlier).
  `INSERT INTO "inspection_item_category" ("id", "organization_id", "name")
     SELECT 'iic_' || lower(substr(md5(o."id"), 1, 24)), o."id", 'General'
     FROM "organization" o
     WHERE NOT EXISTS (
       SELECT 1 FROM "inspection_item_category" c
       WHERE c."organization_id" = o."id" AND c."name" = 'General'
     )
     ON CONFLICT ("organization_id", "name") DO NOTHING`,
  // ---- Inspection-item form fields (the form-builder schema per item) ----
  `CREATE TABLE IF NOT EXISTS "inspection_item_field" (
     "id" text PRIMARY KEY,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "inspection_item_id" text NOT NULL REFERENCES "inspection_item"("id") ON DELETE CASCADE,
     "key" text NOT NULL,
     "label" text NOT NULL,
     "type" text NOT NULL DEFAULT 'text',
     "options" jsonb,
     "required" boolean NOT NULL DEFAULT false,
     "placeholder" text,
     "help_text" text,
     "sort_order" integer NOT NULL DEFAULT 0,
     "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_field_item_idx" ON "inspection_item_field" ("inspection_item_id", "sort_order")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "inspection_item_field_item_key_idx" ON "inspection_item_field" ("inspection_item_id", "key")`,
  // Repeatable group: per-field nested sub-field definitions.
  `ALTER TABLE "inspection_item_field" ADD COLUMN IF NOT EXISTS "sub_fields" jsonb`,
  // Repeatable/table: pre-defined rows that auto-populate the inspector form.
  `ALTER TABLE "inspection_item_field" ADD COLUMN IF NOT EXISTS "preset_rows" jsonb`,
  // Findings: link to the specific checklist row + structured values payload.
  `ALTER TABLE "finding" ADD COLUMN IF NOT EXISTS "item_selection_id" text REFERENCES "inspection_item_selection"("id") ON DELETE CASCADE`,
  `ALTER TABLE "finding" ADD COLUMN IF NOT EXISTS "values" jsonb`,
  `CREATE INDEX IF NOT EXISTS "finding_item_selection_idx" ON "finding" ("item_selection_id")`,
  `ALTER TABLE "inspection" ADD COLUMN IF NOT EXISTS "company_id" text REFERENCES "company"("id") ON DELETE SET NULL`,
  `ALTER TABLE "inspection" ADD COLUMN IF NOT EXISTS "object_id" text REFERENCES "company_object"("id") ON DELETE SET NULL`,
  `CREATE TABLE IF NOT EXISTS "inspection_item_selection" (
     "id" text PRIMARY KEY,
     "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
     "inspection_id" text NOT NULL REFERENCES "inspection"("id") ON DELETE CASCADE,
     "item_id" text REFERENCES "inspection_item"("id") ON DELETE SET NULL,
     "label" text NOT NULL,
     "category" text NOT NULL DEFAULT 'General',
     "checked" boolean NOT NULL DEFAULT false,
     "notes" text,
     "sort_order" integer NOT NULL DEFAULT 0,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "inspection_item_sel_insp_idx" ON "inspection_item_selection" ("inspection_id")`,
];

function planSeedValues(p) {
  // Build a parameterized INSERT ... ON CONFLICT DO NOTHING so re-runs are no-ops.
  return [
    p.id,
    p.name,
    p.tagline,
    p.priceMonthly,
    p.priceYearly,
    p.userLimit,
    p.storageLimitGb,
    JSON.stringify(p.features),
    JSON.stringify(p.highlights),
    p.cta,
    p.popular,
    p.displayOrder,
  ];
}

const PLAN_SEED_SQL = `
  INSERT INTO "plan_definition" (
    "id", "name", "tagline", "price_monthly", "price_yearly",
    "user_limit", "storage_limit_gb", "features", "highlights",
    "cta", "popular", "display_order"
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12)
  ON CONFLICT ("id") DO NOTHING
`;

async function main() {
  if (isPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") || "./.pglite";
    const client = new PGlite(dataDir);
    for (const sql of STATEMENTS) {
      try {
        await client.exec(sql);
        console.log("OK   ", sql.split("\n")[0]);
      } catch (err) {
        console.error("FAIL ", sql.split("\n")[0], err.message);
        throw err;
      }
    }
    for (const seed of PLAN_SEEDS) {
      try {
        await client.query(PLAN_SEED_SQL, planSeedValues(seed));
        console.log("SEED ", seed.id);
      } catch (err) {
        console.error("FAIL seed", seed.id, err.message);
        throw err;
      }
    }
    await client.close();
  } else {
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    for (const sql of STATEMENTS) {
      try {
        await client.unsafe(sql);
        console.log("OK   ", sql.split("\n")[0]);
      } catch (err) {
        console.error("FAIL ", sql.split("\n")[0], err.message);
        throw err;
      }
    }
    for (const seed of PLAN_SEEDS) {
      try {
        await client.unsafe(PLAN_SEED_SQL, planSeedValues(seed));
        console.log("SEED ", seed.id);
      } catch (err) {
        console.error("FAIL seed", seed.id, err.message);
        throw err;
      }
    }
    await client.end();
  }
  console.log("Admin migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
