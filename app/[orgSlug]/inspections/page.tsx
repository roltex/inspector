import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock4,
  Plus,
} from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  company,
  companyObject,
  finding as findingTable,
  inspection,
  inspectionItemSelection,
  user,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { getT } from "@/lib/i18n";
import { ListToolbar } from "./_components/list-toolbar";
import { GroupSection } from "./_components/group-section";
import type { InspectionRowData } from "./_components/inspection-row";

export const metadata = { title: "Inspections" };

type GroupKey =
  | "overdue"
  | "today"
  | "tomorrow"
  | "thisWeek"
  | "inProgress"
  | "drafts"
  | "completed";

type SortKey = "due" | "recent" | "alpha";

const FINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"] as const;
type StatusEnum =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isFinal(status: string): boolean {
  return (FINAL_STATUSES as readonly string[]).includes(status);
}

function bucketOf(
  row: { status: string; scheduledFor: Date | null; completedAt: Date | null },
  now: Date,
): GroupKey {
  const today0 = startOfDay(now);
  const tomorrow0 = new Date(today0);
  tomorrow0.setDate(tomorrow0.getDate() + 1);
  const dayAfter0 = new Date(tomorrow0);
  dayAfter0.setDate(dayAfter0.getDate() + 1);
  const weekEnd = new Date(today0);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (row.status === "IN_PROGRESS") return "inProgress";
  if (isFinal(row.status)) return "completed";
  if (row.status === "DRAFT" && !row.scheduledFor) return "drafts";

  const sched = row.scheduledFor;
  if (!sched) return "drafts";

  if (sched < today0) return "overdue";
  if (sched >= today0 && sched < tomorrow0) return "today";
  if (sched >= tomorrow0 && sched < dayAfter0) return "tomorrow";
  if (sched >= tomorrow0 && sched < weekEnd) return "thisWeek";
  // Future beyond a week — bucket as upcoming under thisWeek's footer? We'll
  // route into thisWeek to keep the rail tidy; the section gets a "show all"
  // link if we ever add pagination. For now, anything further than a week
  // shows in `thisWeek` so users still see it.
  return "thisWeek";
}

export default async function InspectionsPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string };
  searchParams?: { q?: string; status?: string; sort?: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();

  const isInspector = m.role === "INSPECTOR";
  const q = (searchParams?.q ?? "").trim();
  const status = (searchParams?.status ?? "all").toLowerCase() as
    | GroupKey
    | "all";
  const sort = (searchParams?.sort ?? "due") as SortKey;

  /* ---------------------------- WHERE clause ---------------------------- */
  const conds = [eq(inspection.organizationId, m.organization.id)];
  if (isInspector) conds.push(eq(inspection.assigneeId, m.user.id));
  if (q.length > 0) {
    const like = `%${q}%`;
    const search = or(
      ilike(inspection.title, like),
      ilike(company.name, like),
      ilike(companyObject.name, like),
    );
    if (search) conds.push(search);
  }

  /* --------------------------- ORDER BY ---------------------------- */
  const orderBy = (() => {
    switch (sort) {
      case "recent":
        return [desc(inspection.createdAt)];
      case "alpha":
        return [asc(inspection.title)];
      case "due":
      default:
        return [asc(inspection.scheduledFor), desc(inspection.createdAt)];
    }
  })();

  /* ---------------------------- Main query ---------------------------- */
  const rows = await db
    .select({
      id: inspection.id,
      title: inspection.title,
      status: inspection.status,
      score: inspection.score,
      maxScore: inspection.maxScore,
      createdAt: inspection.createdAt,
      scheduledFor: inspection.scheduledFor,
      completedAt: inspection.completedAt,
      companyName: company.name,
      objectName: companyObject.name,
      objectCity: companyObject.city,
      assigneeId: inspection.assigneeId,
      assigneeName: user.name,
      assigneeEmail: user.email,
    })
    .from(inspection)
    .leftJoin(company, eq(company.id, inspection.companyId))
    .leftJoin(companyObject, eq(companyObject.id, inspection.objectId))
    .leftJoin(user, eq(user.id, inspection.assigneeId))
    .where(and(...conds))
    .orderBy(...orderBy)
    .limit(500);

  /* -------------- Aggregates: checklist totals + finding counts -------------- */
  const ids = rows.map((r) => r.id);
  const [checklistRows, findingRows] = await Promise.all([
    ids.length
      ? db
          .select({
            inspectionId: inspectionItemSelection.inspectionId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`sum(case when ${inspectionItemSelection.checked} then 1 else 0 end)::int`,
          })
          .from(inspectionItemSelection)
          .where(inArray(inspectionItemSelection.inspectionId, ids))
          .groupBy(inspectionItemSelection.inspectionId)
      : Promise.resolve([] as { inspectionId: string; total: number; done: number }[]),
    ids.length
      ? db
          .select({
            inspectionId: findingTable.inspectionId,
            count: sql<number>`count(*)::int`,
            maxSev: sql<string>`max(${findingTable.severity}::text)`,
          })
          .from(findingTable)
          .where(inArray(findingTable.inspectionId, ids))
          .groupBy(findingTable.inspectionId)
      : Promise.resolve(
          [] as { inspectionId: string; count: number; maxSev: string | null }[],
        ),
  ]);

  const checklistByIns = new Map<string, { total: number; done: number }>();
  for (const c of checklistRows) {
    checklistByIns.set(c.inspectionId, { total: c.total, done: c.done });
  }
  const findingsByIns = new Map<
    string,
    { count: number; maxSev: string | null }
  >();
  for (const f of findingRows) {
    findingsByIns.set(f.inspectionId, { count: f.count, maxSev: f.maxSev });
  }

  /* ---------------------------- KPIs ---------------------------- */
  const now = new Date();
  const today0 = startOfDay(now);
  const tomorrow0 = new Date(today0);
  tomorrow0.setDate(tomorrow0.getDate() + 1);
  const last30 = new Date(today0);
  last30.setDate(last30.getDate() - 30);

  // KPI counts use a separate, lightweight query against the same scope so
  // they're stable even when filters narrow the visible list. We compute
  // counts in JS over the (already filtered by org/role) full result set to
  // avoid PGlite-specific quirks with FILTER clauses.
  const kpiBaseConds = [eq(inspection.organizationId, m.organization.id)];
  if (isInspector) kpiBaseConds.push(eq(inspection.assigneeId, m.user.id));
  const kpiRows = await db
    .select({
      status: inspection.status,
      scheduledFor: inspection.scheduledFor,
      completedAt: inspection.completedAt,
      updatedAt: inspection.updatedAt,
    })
    .from(inspection)
    .where(and(...kpiBaseConds))
    .limit(2000);
  const kpi = (() => {
    let todayCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;
    let completedCount = 0;
    for (const r of kpiRows) {
      if (r.status === "IN_PROGRESS") inProgressCount += 1;
      if (
        r.scheduledFor &&
        r.scheduledFor >= today0 &&
        r.scheduledFor < tomorrow0
      ) {
        todayCount += 1;
      }
      if (
        r.scheduledFor &&
        r.scheduledFor < today0 &&
        !(FINAL_STATUSES as readonly string[]).includes(r.status)
      ) {
        overdueCount += 1;
      }
      if ((FINAL_STATUSES as readonly string[]).includes(r.status)) {
        const ref = r.completedAt ?? r.updatedAt;
        if (ref && ref >= last30) completedCount += 1;
      }
    }
    return { todayCount, inProgressCount, overdueCount, completedCount };
  })();

  /* ----------------------- Bucketing & projection ----------------------- */
  const groups: Record<GroupKey, InspectionRowData[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    inProgress: [],
    drafts: [],
    completed: [],
  };

  for (const r of rows) {
    const checklist = checklistByIns.get(r.id) ?? { total: 0, done: 0 };
    const findings = findingsByIns.get(r.id) ?? { count: 0, maxSev: null };
    const bucket = bucketOf(
      { status: r.status, scheduledFor: r.scheduledFor, completedAt: r.completedAt },
      now,
    );
    if (status !== "all" && status !== bucket) continue;
    const item: InspectionRowData = {
      id: r.id,
      orgSlug: params.orgSlug,
      title: r.title,
      status: r.status as StatusEnum,
      score: r.score,
      maxScore: r.maxScore,
      scheduledFor: r.scheduledFor ? r.scheduledFor.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      companyName: r.companyName,
      objectName: r.objectName,
      objectCity: r.objectCity,
      assigneeName: r.assigneeName,
      assigneeEmail: r.assigneeEmail,
      checklistTotal: checklist.total,
      checklistDone: checklist.done,
      findingsCount: findings.count,
      maxSeverity: (findings.maxSev as InspectionRowData["maxSeverity"]) ?? null,
    };
    groups[bucket].push(item);
  }

  // Cap completed group display so it doesn't dominate the page.
  if (groups.completed.length > 25) {
    groups.completed = groups.completed.slice(0, 25);
  }

  const totalAfterFilters = Object.values(groups).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );

  /* --------------- Status options (for the toolbar chips) --------------- */
  const statusChips: { id: GroupKey | "all"; label: string; count?: number }[] = [
    { id: "all", label: t("modules.inspections.filter.all") },
    {
      id: "overdue",
      label: t("modules.inspections.groups.overdue"),
    },
    { id: "today", label: t("modules.inspections.groups.today") },
    { id: "thisWeek", label: t("modules.inspections.groups.thisWeek") },
    { id: "inProgress", label: t("modules.inspections.groups.inProgress") },
    { id: "completed", label: t("modules.inspections.groups.completed") },
  ];

  /* --------------- Group display order & metadata --------------- */
  const groupOrder: {
    key: GroupKey;
    title: string;
    icon: "alarm" | "today" | "tomorrow" | "calendar" | "play" | "draft" | "check";
    tone: "destructive" | "warning" | "primary" | "secondary" | "success";
  }[] = [
    { key: "overdue", title: t("modules.inspections.groups.overdue"), icon: "alarm", tone: "destructive" },
    { key: "today", title: t("modules.inspections.groups.today"), icon: "today", tone: "primary" },
    { key: "tomorrow", title: t("modules.inspections.groups.tomorrow"), icon: "tomorrow", tone: "warning" },
    { key: "thisWeek", title: t("modules.inspections.groups.thisWeek"), icon: "calendar", tone: "secondary" },
    { key: "inProgress", title: t("modules.inspections.groups.inProgress"), icon: "play", tone: "warning" },
    { key: "drafts", title: t("modules.inspections.groups.drafts"), icon: "draft", tone: "secondary" },
    { key: "completed", title: t("modules.inspections.groups.completed"), icon: "check", tone: "success" },
  ];

  const isEmpty = rows.length === 0 && q.length === 0 && status === "all";
  const noMatches = totalAfterFilters === 0 && !isEmpty;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isInspector
            ? t("modules.inspections.myInspections")
            : t("modules.inspections.title")
        }
        description={
          isInspector
            ? t("modules.inspections.myInspectionsHint")
            : t("modules.inspections.listDescription")
        }
        actions={
          <Button asChild size="lg">
            <Link href={`/${params.orgSlug}/inspections/new`}>
              <Plus className="h-4 w-4" />
              {t("modules.inspections.newInspection")}
            </Link>
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("modules.inspections.kpi.today")}
          value={kpi.todayCount}
          hint={t("modules.inspections.kpi.todayHint")}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label={t("modules.inspections.kpi.inProgress")}
          value={kpi.inProgressCount}
          hint={t("modules.inspections.kpi.inProgressHint")}
          icon={<Clock4 className="h-4 w-4" />}
        />
        <StatCard
          label={t("modules.inspections.kpi.overdue")}
          value={kpi.overdueCount}
          hint={t("modules.inspections.kpi.overdueHint")}
          icon={<AlarmClock className="h-4 w-4 text-destructive" />}
          className={kpi.overdueCount > 0 ? "border-destructive/40" : undefined}
        />
        <StatCard
          label={t("modules.inspections.kpi.completed30d")}
          value={kpi.completedCount}
          hint={t("modules.inspections.kpi.completed30dHint")}
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        />
      </div>

      {/* Toolbar (sticky) */}
      <ListToolbar
        q={q}
        status={status}
        sort={sort}
        chips={statusChips}
      />

      {/* Empty / no-matches / grouped lists */}
      {isEmpty ? (
        <EmptyState
          icon={<ClipboardCheck className="h-5 w-5" />}
          title={t("modules.inspections.empty")}
          description={
            isInspector
              ? t("modules.inspections.myEmptyHint")
              : t("modules.inspections.listDescription")
          }
          action={
            <Button asChild>
              <Link href={`/${params.orgSlug}/inspections/new`}>
                {t("modules.inspections.newInspection")}
              </Link>
            </Button>
          }
        />
      ) : noMatches ? (
        <EmptyState
          icon={<ClipboardCheck className="h-5 w-5" />}
          title={t("modules.inspections.noMatches")}
          description={t("modules.inspections.noMatchesHint")}
          action={
            <Button variant="outline" asChild>
              <Link href={`/${params.orgSlug}/inspections`}>
                {t("modules.inspections.filter.clear")}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groupOrder.map((g) => {
            const items = groups[g.key];
            if (items.length === 0) return null;
            return (
              <GroupSection
                key={g.key}
                title={g.title}
                icon={g.icon}
                tone={g.tone}
                items={items}
                isInspector={isInspector}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
