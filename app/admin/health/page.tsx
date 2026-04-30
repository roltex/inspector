import path from "node:path";
import { promises as fs } from "node:fs";
import { sql } from "drizzle-orm";
import { Activity, Database, HardDrive, CreditCard, Bell, Mail } from "lucide-react";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { isBillingEnabled } from "@/lib/billing/stripe";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function pingDatabase() {
  const start = Date.now();
  try {
    await db.execute(sql`select 1 as ok`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function storageStats() {
  const dir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  let bytes = 0;
  let files = 0;
  async function walk(d: string) {
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        try {
          const st = await fs.stat(p);
          bytes += st.size;
          files += 1;
        } catch {
          /* ignore */
        }
      }
    }
  }
  await walk(dir);
  return { dir, bytes, files };
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function dbDriver() {
  const url = env.DATABASE_URL ?? "";
  if (!url || url.startsWith("file:") || url.startsWith("pglite:")) return "PGlite (local)";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) return "Postgres";
  return "unknown";
}

export default async function AdminHealthPage() {
  const [ping, storage] = await Promise.all([pingDatabase(), storageStats()]);
  const uptime = process.uptime();

  const checks = [
    {
      icon: Database,
      label: "Database",
      ok: ping.ok,
      detail: ping.ok ? `${dbDriver()} · ${ping.latencyMs}ms` : (ping.error ?? "Failed"),
    },
    {
      icon: HardDrive,
      label: "Storage",
      ok: true,
      detail: `${env.STORAGE_DRIVER} · ${fmtBytes(storage.bytes)} across ${storage.files} files`,
    },
    {
      icon: CreditCard,
      label: "Billing",
      ok: isBillingEnabled(),
      detail: isBillingEnabled() ? "Stripe configured" : "Stripe not configured",
    },
    {
      icon: Bell,
      label: "Web Push",
      ok: Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      detail:
        env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
          ? "VAPID keys configured"
          : "VAPID keys missing",
    },
    {
      icon: Mail,
      label: "Email",
      ok: Boolean(env.RESEND_API_KEY),
      detail: env.RESEND_API_KEY ? "Resend configured" : "No transactional email — falling back to console",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System health"
        description="Live status of the platform's runtime dependencies."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Process</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Stat label="Uptime" value={`${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`} />
          <Stat label="Node" value={process.version} />
          <Stat label="Platform" value={`${process.platform}/${process.arch}`} />
          <Stat label="Env" value={process.env.NODE_ENV ?? "development"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service checks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {checks.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.label} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        c.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{c.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.detail}</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      c.ok ? "text-success" : "text-destructive"
                    }`}
                  >
                    {c.ok ? "OK" : "Issue"}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <KV k="DB driver" v={dbDriver()} />
            <KV k="Storage driver" v={env.STORAGE_DRIVER} />
            <KV k="Storage path" v={storage.dir} />
            <KV k="App URL" v={env.NEXT_PUBLIC_APP_URL} />
            <KV k="Auth URL" v={env.BETTER_AUTH_URL} />
            <KV k="App name" v={env.NEXT_PUBLIC_APP_NAME ?? "Inspector"} />
            <KV k="Stripe webhook" v={env.STRIPE_WEBHOOK_SECRET ? "configured" : "missing"} />
            <KV k="Email from" v={env.EMAIL_FROM ?? "—"} />
            <KV k="Super-admin allowlist" v={env.SUPER_ADMIN_EMAILS || "(empty)"} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate text-right font-mono text-xs">{v ?? "—"}</dd>
    </div>
  );
}
