import Link from "next/link";
import { count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { Building2, Users, CreditCard, AlertTriangle, ShieldCheck, ScrollText } from "lucide-react";
import { db } from "@/lib/db/client";
import {
  organization,
  user,
  session,
  auditLog,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function loadStats() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [orgs] = await db.select({ c: count() }).from(organization);
  const [users] = await db.select({ c: count() }).from(user);
  const [admins] = await db
    .select({ c: count() })
    .from(user)
    .where(eq(user.superAdmin, true));
  const [banned] = await db
    .select({ c: count() })
    .from(user)
    .where(isNotNull(user.bannedAt));
  const [active7] = await db
    .select({ c: sql<number>`count(distinct ${session.userId})` })
    .from(session)
    .where(gte(session.updatedAt, since));
  const [paid] = await db
    .select({ c: count() })
    .from(organization)
    .where(eq(organization.subscriptionStatus, "active"));
  const [suspended] = await db
    .select({ c: count() })
    .from(organization)
    .where(isNotNull(organization.suspendedAt));

  const planDist = await db
    .select({ plan: organization.plan, c: count() })
    .from(organization)
    .groupBy(organization.plan);

  const recentAudits = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      createdAt: auditLog.createdAt,
      organizationId: auditLog.organizationId,
      userId: auditLog.userId,
    })
    .from(auditLog)
    .orderBy(sql`${auditLog.createdAt} desc`)
    .limit(8);

  const recentOrgs = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug, plan: organization.plan, createdAt: organization.createdAt })
    .from(organization)
    .orderBy(sql`${organization.createdAt} desc`)
    .limit(6);

  return {
    orgs: orgs?.c ?? 0,
    users: users?.c ?? 0,
    admins: admins?.c ?? 0,
    banned: banned?.c ?? 0,
    active7: Number(active7?.c ?? 0),
    paid: paid?.c ?? 0,
    suspended: suspended?.c ?? 0,
    planDist,
    recentAudits,
    recentOrgs,
  };
}

export default async function AdminOverviewPage() {
  const s = await loadStats();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="Health, growth and recent activity across every tenant on Inspector."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Tenants" value={s.orgs} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Users" value={s.users} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active (7d)" value={s.active7} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Paid tenants" value={s.paid} icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Super-admins" value={s.admins} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Banned users" value={s.banned} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Suspended tenants" value={s.suspended} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Audit events" value={s.recentAudits.length} icon={<ScrollText className="h-4 w-4" />} hint="Most recent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Plan distribution</CardTitle>
            <Link href="/admin/billing" className="text-xs text-primary underline-offset-4 hover:underline">
              See billing
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {s.planDist.length === 0 && (
                <li className="text-sm text-muted-foreground">No tenants yet.</li>
              )}
              {s.planDist.map((p) => (
                <li
                  key={p.plan}
                  className="flex items-center justify-between rounded-xl border p-3 text-sm"
                >
                  <span className="font-medium">{p.plan}</span>
                  <span className="text-muted-foreground">{p.c}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest tenants</CardTitle>
            <Link
              href="/admin/organizations"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              See all
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {s.recentOrgs.length === 0 && (
                <li className="text-sm text-muted-foreground">No tenants yet.</li>
              )}
              {s.recentOrgs.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/organizations/${o.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {o.name}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">/{o.slug}</div>
                  </div>
                  <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                    {o.plan}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent audit events</CardTitle>
          <Link href="/admin/audit" className="text-xs text-primary underline-offset-4 hover:underline">
            See all
          </Link>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {s.recentAudits.length === 0 && (
              <li className="text-sm text-muted-foreground">No audit events yet.</li>
            )}
            {s.recentAudits.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{a.action}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.entityType ?? "—"} · {a.entityId ?? "—"}
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
