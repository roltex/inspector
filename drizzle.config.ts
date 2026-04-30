import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "";
const isPglite = !url || url.startsWith("file:") || url.startsWith("pglite:");
const pgliteDir =
  url.replace(/^file:\/?\/?/, "").replace(/^pglite:\/?\/?/, "") || "./.pglite";

export default (
  isPglite
    ? {
        schema: "./lib/db/schema.ts",
        out: "./lib/db/migrations",
        dialect: "postgresql",
        driver: "pglite",
        dbCredentials: { url: pgliteDir },
        strict: true,
        verbose: true,
      }
    : {
        schema: "./lib/db/schema.ts",
        out: "./lib/db/migrations",
        dialect: "postgresql",
        dbCredentials: { url },
        strict: true,
        verbose: true,
      }
) satisfies Config;
