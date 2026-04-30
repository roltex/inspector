// Read-only smoke check: verifies the schema is in place and reports the
// current database state for the platform admin panel.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
const isPglite = !url || url.startsWith("file:") || url.startsWith("pglite:");

async function withClient(fn) {
  if (isPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") || "./.pglite";
    const client = new PGlite(dataDir);
    try {
      return await fn(async (q) => (await client.query(q)).rows);
    } finally {
      await client.close();
    }
  } else {
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    try {
      return await fn(async (q) => client.unsafe(q));
    } finally {
      await client.end();
    }
  }
}

async function check() {
  await withClient(async (q) => {
    const cols = await q(`
      select table_name, column_name from information_schema.columns
      where table_name in ('user','session','organization','app_setting')
        and column_name in (
          'super_admin','banned_at','ban_reason',
          'impersonated_by',
          'suspended_at','suspended_reason',
          'key','value','updated_by'
        )
      order by table_name, column_name
    `);
    console.log("\n# Schema columns present:");
    for (const c of cols) console.log(`  ${c.table_name}.${c.column_name}`);

    const users = await q(`select id, email, super_admin, banned_at from "user" order by created_at desc limit 5`);
    console.log("\n# Recent users:");
    for (const u of users) {
      console.log(`  ${u.email}  super_admin=${u.super_admin}  banned=${u.banned_at ? "yes" : "no"}`);
    }

    const orgs = await q(`select id, name, plan, suspended_at from "organization" order by created_at desc limit 5`);
    console.log("\n# Recent tenants:");
    for (const o of orgs) {
      console.log(`  ${o.name}  plan=${o.plan}  suspended=${o.suspended_at ? "yes" : "no"}`);
    }

    const settings = await q(`select key from "app_setting"`);
    console.log(`\n# Settings rows: ${settings.length}`);

    const audits = await q(
      `select action, count(*)::int as c from "audit_log" group by action order by c desc limit 10`,
    );
    console.log(`\n# Top audit actions:`);
    for (const a of audits) console.log(`  ${a.action}  ${a.c}`);
  });
}

check().catch((e) => {
  console.error(e);
  process.exit(1);
});
