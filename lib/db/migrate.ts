import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";

async function main() {
  if (!url || url.startsWith("file:") || url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dataDir = url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") || "./.pglite";
    const client = new PGlite(dataDir);
    const db = drizzle(client);
    console.log(`Running migrations against PGlite at ${dataDir}…`);
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    await client.close();
  } else {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1 });
    const db = drizzle(client);
    console.log("Running migrations against Postgres…");
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    await client.end();
  }
  console.log("✅ Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
