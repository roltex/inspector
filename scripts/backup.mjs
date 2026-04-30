#!/usr/bin/env node
/**
 * Database backup script. Calls pg_dump and writes a compressed dump
 * to ./backups/<timestamp>.sql.gz. Configure via DATABASE_URL.
 *
 * Usage: node scripts/backup.mjs
 *   --out <dir>    Override backup directory (default ./backups)
 *   --keep <n>     Retain only the latest N backups (default 14)
 *
 * Requires `pg_dump` to be available on PATH.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, statSync, unlinkSync, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { join } from "node:path";
import "dotenv/config";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const outDir = flag("out", "backups");
const keep = parseInt(flag("keep", "14"), 10);
mkdirSync(outDir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = join(outDir, `inspector-${ts}.sql.gz`);

console.log(`📦 Backing up to ${outFile}`);

const dump = spawn("pg_dump", ["--no-owner", "--no-privileges", url], {
  stdio: ["ignore", "pipe", "inherit"],
});

const gzip = createGzip();
const sink = createWriteStream(outFile);
dump.stdout.pipe(gzip).pipe(sink);

dump.on("close", (code) => {
  if (code !== 0) {
    console.error(`pg_dump exited with code ${code}`);
    process.exit(code);
  }
  console.log(`✅ Backup complete: ${outFile}`);
  rotate(outDir, keep);
});

function rotate(dir, n) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql.gz"))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const old of files.slice(n)) {
    unlinkSync(join(dir, old.f));
    console.log(`🧹 Removed old backup: ${old.f}`);
  }
}
