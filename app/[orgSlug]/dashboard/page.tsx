import Link from "next/link";
import { and, eq, gte, sql, count } from "drizzle-orm";
import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  ListTodo,
  ShieldAlert,
  TrendingUp,
  Plus,
} from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { action, incident, inspection, observation } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils";
import { InspectorDashboard } from "./inspector-dashboard";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const orgId = m.organization.id;

  // Inspectors get a focused, task-driven dashboard scoped to their own work.
  if (m.role === "INSPECTOR") {
    return (
      <InspectorDashboard
        orgSlug={params.orgSlug}
        orgId={orgId}
        userId={m.user.id}
        userName={m.user.name ?? null}
      />
    );
  }
  const last30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [
    [inspCount],
    [openIncidentCount],
    [openCapaCount],
    [overdueCapa],
    [obsCount],
    recentInspections,
    recentIncidents,
    recentActions,
  ] = await Promise.all([
    db.select({ c: count() }).from(inspection).where(eq(inspection.organizationId, orgId)),
    db
      .select({ c: count() })
      .from(incident)
      .where(and(eq(incident.organizationId, orgId), eq(incident.status, "OPEN"))),
    db
      .select({ c: count() })
      .from(action)
      .where(and(eq(action.organizationId, orgId), eq(action.status, "OPEN"))),
    db
      .select({ c: count() })
      .from(action)
      .where(
        and(
          eq(action.organizationId, orgId),
          eq(action.status, "OVERDUE"),
        ),
      ),
    db
      .select({ c: count() })
      .from(observation)
      .where(and(eq(observation.organizationId, orgId), gte(observation.createdAt, last30))),
    db
      .select()
      .from(inspection)
      .where(eq(inspection.organizationId, orgId))
      .orderBy(sql`${inspection.createdAt} desc`)
      .limit(5),
    db
      .select()
      .from(incident)
      .where(eq(incident.organizationId, orgId))
      .orderBy(sql`${incident.occurredAt} desc`)
      .limit(5),
    db
      .select()
      .from(action)
      .where(eq(action.organizationId, orgId))
      .orderBy(sql`${action.dueDate} asc nulls last`)
      .limit(5),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${(m.user.name ?? "").split(" ")[0] || "there"}`}
        description="Here's a snapshot of safety performance across your workspace."
        actions={
          <Button asChild size="lg">
            <Link href={`/${params.orgSlug}/inspections/new`}>
              <Plus className="h-4 w-4" />
              New inspection
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Inspections"
          value={inspCount?.c ?? 0}
          icon={<ClipboardCheck className="h-5 w-5" />}
          hint="All-time"
        />
        <StatCard
          label="Open incidents"
          value={openIncidentCount?.c ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          hint="Needs review"
        />
        <StatCard
          label="Open CAPAs"
          value={openCapaCount?.c ?? 0}
          icon={<ListTodo className="h-5 w-5" />}
          hint={overdueCapa?.c ? `${overdueCapa.c} overdue` : "On track"}
        />
        <StatCard
          label="Observations (30d)"
          value={obsCount?.c ?? 0}
          icon={<Eye className="h-5 w-5" />}
          hint="Leading indicator"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Recent inspections</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${params.orgSlug}/inspections`}>View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentInspections.length === 0 ? (
              <EmptyState
                className="m-4"
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="No inspections yet"
                description="Kick off your first site walk — it takes under a minute."
                action={
                  <Button asChild>
                    <Link href={`/${params.orgSlug}/inspections/new`}>Start inspection</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {recentInspections.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/${params.orgSlug}/inspections/${i.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(i.createdAt)} · score {i.score ?? "—"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          i.status === "COMPLETED"
                            ? "success"
                            : i.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {i.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Priority actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentActions.length === 0 ? (
              <EmptyState className="m-4" title="All caught up" description="No open CAPAs assigned." />
            ) : (
              <ul className="divide-y">
                {recentActions.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/${params.orgSlug}/capa/${a.id}`}
                      className="flex items-start justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {a.dueDate ? formatRelative(a.dueDate) : "—"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          a.priority === "CRITICAL"
                            ? "destructive"
                            : a.priority === "HIGH"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {a.priority}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> Recent incidents
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${params.orgSlug}/incidents`}>View all →</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentIncidents.length === 0 ? (
            <EmptyState className="m-4" title="No incidents reported" description="Keep it that way." />
          ) : (
            <ul className="divide-y">
              {recentIncidents.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/${params.orgSlug}/incidents/${i.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.type.replace("_", " ")} · {formatRelative(i.occurredAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        i.severity === "CRITICAL"
                          ? "destructive"
                          : i.severity === "HIGH"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {i.severity}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
