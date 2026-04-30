// Promote (or demote) a user to platform super-admin.
//   node scripts/promote-admin.mjs you@example.com
//   node scripts/promote-admin.mjs you@example.com --demote
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const demote = args.includes("--demote");

if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email> [--demote]");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "";
const isPglite = !url || url.startsWith("file:") || url.startsWith("pglite:");
const target = email.toLowerCase();
const newValue = demote ? false : true;

async function run() {
  if (isPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") || "./.pglite";
    const client = new PGlite(dataDir);
    const found = await client.query(`SELECT id, email FROM "user" WHERE lower(email) = $1`, [target]);
    if (!found.rows.length) {
      console.error(`No user with email ${email} found.`);
      await client.close();
      process.exit(1);
    }
    await client.query(`UPDATE "user" SET super_admin = $1, updated_at = now() WHERE lower(email) = $2`, [newValue, target]);
    await client.close();
  } else {
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 1 });
    const found = await client`SELECT id, email FROM "user" WHERE lower(email) = ${target}`;
    if (!found.length) {
      console.error(`No user with email ${email} found.`);
      await client.end();
      process.exit(1);
    }
    await client`UPDATE "user" SET super_admin = ${newValue}, updated_at = now() WHERE lower(email) = ${target}`;
    await client.end();
  }
  console.log(`${demote ? "Demoted" : "Promoted"} ${email} ${demote ? "from" : "to"} super-admin.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
