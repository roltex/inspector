import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export { schema };

/**
 * Inspector supports two database drivers from the same Drizzle schema:
 *
 *   - `postgres-js` — when DATABASE_URL points at a real Postgres server
 *                     (recommended for production deployment).
 *   - `PGlite`      — in-process WASM Postgres for fully local dev with no
 *                     server install. Activated when DATABASE_URL is empty
 *                     or starts with `file:` / `pglite:`.
 *
 * The DB is initialized lazily on first use to avoid pulling the WASM payload
 * into static page generation during the production build.
 */

export function isPgliteUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  return url.startsWith("file:") || url.startsWith("pglite:");
}

export function pgliteDataDir(url: string | undefined): string {
  if (!url) return "./.pglite";
  if (url.startsWith("file:")) return url.replace(/^file:\/?\/?/, "") || "./.pglite";
  if (url.startsWith("pglite:")) return url.replace(/^pglite:\/?\/?/, "") || "./.pglite";
  return "./.pglite";
}

type DrizzleDb = ReturnType<typeof drizzlePg<typeof schema>>;

declare global {
  // eslint-disable-next-line no-var
  var __inspectorDb: DrizzleDb | undefined;
}

function buildDb(): DrizzleDb {
  const url = env.DATABASE_URL;
  if (isPgliteUrl(url)) {
    const client = new PGlite(pgliteDataDir(url));
    return drizzlePglite(client, { schema }) as unknown as DrizzleDb;
  }
  const client = postgres(url, { max: 10, idle_timeout: 20, prepare: false });
  return drizzlePg(client, { schema, logger: process.env.NODE_ENV === "development" });
}

function getDb(): DrizzleDb {
  if (globalThis.__inspectorDb) return globalThis.__inspectorDb;
  const instance = buildDb();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__inspectorDb = instance;
  } else {
    globalThis.__inspectorDb = instance;
  }
  return instance;
}

// Lazy proxy: defers actual database initialization until first property access.
// This prevents the WASM payload of PGlite from being loaded during static page
// generation in `next build`.
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop as keyof typeof real];
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
}) as DrizzleDb;
