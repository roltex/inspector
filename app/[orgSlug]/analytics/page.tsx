import { and, count, eq, gte, sql } from "drizzle-orm";
import { BarChart3, ClipboardCheck, Eye, AlertTriangle, ListTodo } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { action, incident, inspection, observation } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TrendChart } from "./trend-chart";

export const metadata = { title: "Analytics" };

export default async function Analytics({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const orgId = m.organization.id;
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const [[totalInsp], [totalInc], [openCapa], [overdueCapa], [totalObs], [totalLostDays]] =
    await Promise.all([
      db.select({ c: count() }).from(inspection).where(eq(inspection.organizationId, orgId)),
      db.select({ c: count() }).from(incident).where(eq(incident.organizationId, orgId)),
      db
        .select({ c: count() })
        .from(action)
        .where(and(eq(action.organizationId, orgId), eq(action.status, "OPEN"))),
      db
        .select({ c: count() })
        .from(action)
        .where(and(eq(action.organizationId, orgId), eq(action.status, "OVERDUE"))),
      db.select({ c: count() }).from(observation).where(eq(observation.organizationId, orgId)),
      db
        .select({
          c: sql<number>`coalesce(sum(${incident.lostTimeDays}), 0)`,
        })
        .from(incident)
        .where(eq(incident.organizationId, orgId)),
    ]);

  // KPI rough calcs (placeholder hours)
  const manHours = 200_000;
  const trir = totalInc ? ((totalInc.c * 200_000) / manHours).toFixed(2) : "0.00";
  const ltifr = totalLostDays ? ((Number(totalLostDays.c) * 1_000_000) / manHours).toFixed(2) : "0.00";

  // Trend data
  const trend = await db
    .select({
      day: sql<string>`date_trunc('day', ${observation.createdAt})::date`,
      obs: count(observation.id),
    })
    .from(observation)
    .where(and(eq(observation.organizationId, orgId), gte(observation.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${observation.createdAt})`)
    .orderBy(sql`date_trunc('day', ${observation.createdAt})`);

  const trendInc = await db
    .select({
      day: sql<string>`date_trunc('day', ${incident.occurredAt})::date`,
      inc: count(incident.id),
    })
    .from(incident)
    .where(and(eq(incident.organizationId, orgId), gte(incident.occurredAt, since)))
    .groupBy(sql`date_trunc('day', ${incident.occurredAt})`)
    .orderBy(sql`date_trunc('day', ${incident.occurredAt})`);

  // Merge trend
  const byDay = new Map<string, { day: string; observations: number; incidents: number }>();
  for (const t of trend) byDay.set(t.day, { day: t.day, observations: Number(t.obs), incidents: 0 });
  for (const t of trendInc) {
    const prev = byDay.get(t.day);
    if (prev) prev.incidents = Number(t.inc);
    else byDay.set(t.day, { day: t.day, observations: 0, incidents: Number(t.inc) });
  }
  const chartData = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Performance across safety KPIs, last 90 days." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Inspections" value={totalInsp?.c ?? 0} icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="Observations" value={totalObs?.c ?? 0} icon={<Eye className="h-5 w-5" />} />
        <StatCard label="Incidents" value={totalInc?.c ?? 0} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Open CAPAs" value={openCapa?.c ?? 0} icon={<ListTodo className="h-5 w-5" />} hint={overdueCapa?.c ? `${overdueCapa.c} overdue` : "On track"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> TRIR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{trir}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Total recordable incident rate per 200,000 hours worked (sample data).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> LTIFR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{ltifr}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lost time injury frequency rate per 1,000,000 hours worked (sample data).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trend — observations vs incidents</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <TrendChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
