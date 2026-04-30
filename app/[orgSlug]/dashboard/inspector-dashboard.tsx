import "server-only";
import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ListChecks,
  MapPin,
  Plus,
  PlayCircle,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { company, companyObject, inspection } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { getT } from "@/lib/i18n";

interface Props {
  orgSlug: string;
  orgId: string;
  userId: string;
  userName: string | null;
}

const STATUS_VARIANT: Record<
  string,
  "success" | "destructive" | "warning" | "secondary"
> = {
  COMPLETED: "success",
  FAILED: "destructive",
  IN_PROGRESS: "warning",
  SCHEDULED: "secondary",
  DRAFT: "secondary",
  CANCELLED: "secondary",
};

const OPEN_STATUSES = ["DRAFT", "SCHEDULED", "IN_PROGRESS"] as const;
const FINALIZED_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"] as const;

type Row = {
  id: string;
  title: string;
  status: string;
  score: number | null;
  scheduledFor: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  companyName: string | null;
  objectName: string | null;
  objectCity: string | null;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function InspectorDashboard({ orgSlug, orgId, userId, userName }: Props) {
  const { t } = await getT();
  const now = new Date();
  const today0 = startOfDay(now);
  const tomorrow0 = new Date(today0);
  tomorrow0.setDate(tomorrow0.getDate() + 1);
  const dayAfter0 = new Date(tomorrow0);
  dayAfter0.setDate(dayAfter0.getDate() + 1);
  const weekEnd = new Date(today0);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const last14 = new Date(today0);
  last14.setDate(last14.getDate() - 14);

  // Fetch every inspection assigned to me in this org. Capped to keep payload sane,
  // and we bucket the small list in JS for clarity.
  const mine: Row[] = await db
    .select({
      id: inspection.id,
      title: inspection.title,
      status: inspection.status,
      score: inspection.score,
      scheduledFor: inspection.scheduledFor,
      createdAt: inspection.createdAt,
      completedAt: inspection.completedAt,
      companyName: company.name,
      objectName: companyObject.name,
      objectCity: companyObject.city,
    })
    .from(inspection)
    .leftJoin(company, eq(company.id, inspection.companyId))
    .leftJoin(companyObject, eq(companyObject.id, inspection.objectId))
    .where(
      and(
        eq(inspection.organizationId, orgId),
        eq(inspection.assigneeId, userId),
      ),
    )
    .orderBy(asc(inspection.scheduledFor), desc(inspection.createdAt))
    .limit(200);

  const todayList: Row[] = [];
  const tomorrowList: Row[] = [];
  const upcomingList: Row[] = [];
  const overdueList: Row[] = [];
  const inProgressList: Row[] = [];
  const recentDoneList: Row[] = [];

  for (const r of mine) {
    const isOpen = (OPEN_STATUSES as readonly string[]).includes(r.status);
    const isFinal = (FINALIZED_STATUSES as readonly string[]).includes(r.status);

    if (r.status === "IN_PROGRESS" || r.status === "DRAFT") {
      inProgressList.push(r);
    }

    if (r.scheduledFor && isOpen) {
      const d = new Date(r.scheduledFor);
      if (d >= today0 && d < tomorrow0) todayList.push(r);
      else if (d >= tomorrow0 && d < dayAfter0) tomorrowList.push(r);
      else if (d >= dayAfter0 && d < weekEnd) upcomingList.push(r);
      else if (d < today0) overdueList.push(r);
    }

    if (
      isFinal &&
      (r.completedAt ? new Date(r.completedAt) : new Date(r.createdAt)) >= last14
    ) {
      recentDoneList.push(r);
    }
  }

  // De-dupe the "Continue" feed against rows already shown elsewhere.
  const knownIds = new Set([
    ...todayList.map((r) => r.id),
    ...tomorrowList.map((r) => r.id),
    ...upcomingList.map((r) => r.id),
    ...overdueList.map((r) => r.id),
  ]);
  const continueList = inProgressList.filter((r) => !knownIds.has(r.id));

  const completedToday = recentDoneList.filter(
    (r) => (r.completedAt ? new Date(r.completedAt) : new Date(r.createdAt)) >= today0,
  ).length;

  const firstName = (userName ?? "").split(" ")[0] || t("modules.inspections.you");

  return (
    <div className="space-y-6">
      {/* Hero / greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {formatDate(now, { dateStyle: "full" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("inspectorDashboard.greeting", { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("inspectorDashboard.subtitle")}
          </p>
        </div>
        <Button asChild size="lg" className="self-start sm:self-auto">
          <Link href={`/${orgSlug}/inspections/new`}>
            <Plus className="h-4 w-4" />
            {t("modules.inspections.newInspection")}
          </Link>
        </Button>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("inspectorDashboard.today")}
          value={todayList.length}
          icon={<Calendar className="h-5 w-5" />}
          hint={
            todayList.length === 0
              ? t("inspectorDashboard.nothingToday")
              : t("inspectorDashboard.scheduledToday")
          }
        />
        <StatCard
          label={t("inspectorDashboard.tomorrow")}
          value={tomorrowList.length}
          icon={<CalendarDays className="h-5 w-5" />}
          hint={t("inspectorDashboard.planAhead")}
        />
        <StatCard
          label={t("inspectorDashboard.inProgress")}
          value={inProgressList.length}
          icon={<PlayCircle className="h-5 w-5" />}
          hint={t("inspectorDashboard.resumeHint")}
        />
        <StatCard
          label={t("inspectorDashboard.overdue")}
          value={overdueList.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          hint={
            overdueList.length === 0
              ? t("inspectorDashboard.allCaughtUp")
              : t("inspectorDashboard.needsAttention")
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today — primary card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              {t("inspectorDashboard.todayHeader")}
            </CardTitle>
            <Badge variant="secondary">{todayList.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <InspectionList
              orgSlug={orgSlug}
              rows={todayList}
              emptyTitle={t("inspectorDashboard.todayEmpty")}
              emptyHint={t("inspectorDashboard.todayEmptyHint")}
              showTimeOnly
            />
          </CardContent>
        </Card>

        {/* Continue (drafts / in-progress) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4 text-primary" />
              {t("inspectorDashboard.continueHeader")}
            </CardTitle>
            <Badge variant="secondary">{continueList.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <InspectionList
              orgSlug={orgSlug}
              rows={continueList}
              emptyTitle={t("inspectorDashboard.continueEmpty")}
              emptyHint={t("inspectorDashboard.continueEmptyHint")}
              compact
            />
          </CardContent>
        </Card>
      </div>

      {/* Overdue — only render the card when there's something to flag */}
      {overdueList.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/[0.03]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t("inspectorDashboard.overdueHeader")}
            </CardTitle>
            <Badge variant="destructive">{overdueList.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <InspectionList orgSlug={orgSlug} rows={overdueList} highlightOverdue />
          </CardContent>
        </Card>
      )}

      {/* Tomorrow + Upcoming */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              {t("inspectorDashboard.tomorrowHeader")}
            </CardTitle>
            <Badge variant="secondary">{tomorrowList.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <InspectionList
              orgSlug={orgSlug}
              rows={tomorrowList}
              emptyTitle={t("inspectorDashboard.tomorrowEmpty")}
              showTimeOnly
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" />
              {t("inspectorDashboard.upcomingHeader")}
            </CardTitle>
            <Badge variant="secondary">{upcomingList.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <InspectionList
              orgSlug={orgSlug}
              rows={upcomingList}
              emptyTitle={t("inspectorDashboard.upcomingEmpty")}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recently completed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t("inspectorDashboard.recentHeader")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("inspectorDashboard.completedToday", { count: completedToday })}
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${orgSlug}/inspections`}>
                {t("inspectorDashboard.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <InspectionList
            orgSlug={orgSlug}
            rows={recentDoneList.slice(0, 8)}
            emptyTitle={t("inspectorDashboard.recentEmpty")}
            useCompletedAt
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  List sub-component                                                        */
/* -------------------------------------------------------------------------- */

function InspectionList({
  orgSlug,
  rows,
  emptyTitle,
  emptyHint,
  showTimeOnly,
  useCompletedAt,
  highlightOverdue,
  compact,
}: {
  orgSlug: string;
  rows: Row[];
  emptyTitle?: string;
  emptyHint?: string;
  showTimeOnly?: boolean;
  useCompletedAt?: boolean;
  highlightOverdue?: boolean;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        className="m-4"
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={emptyTitle ?? "—"}
        description={emptyHint}
      />
    );
  }

  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const subtitle =
          [r.companyName, r.objectName].filter(Boolean).join(" · ") || "—";
        const dateForDisplay = useCompletedAt
          ? r.completedAt ?? r.createdAt
          : r.scheduledFor ?? r.createdAt;
        return (
          <li key={r.id}>
            <Link
              href={`/${orgSlug}/inspections/${r.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 sm:items-center"
            >
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <Badge
                    variant={STATUS_VARIANT[r.status] ?? "secondary"}
                    className="sm:hidden"
                  >
                    {r.status.replace("_", " ")}
                  </Badge>
                </div>
                {!compact && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {(r.companyName || r.objectName) && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[14rem]">{subtitle}</span>
                      </span>
                    )}
                    {r.objectCity && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.objectCity}
                      </span>
                    )}
                    {dateForDisplay && (
                      <span
                        className={
                          "inline-flex items-center gap-1 " +
                          (highlightOverdue ? "text-destructive font-medium" : "")
                        }
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {showTimeOnly
                          ? formatDate(dateForDisplay, { timeStyle: "short" })
                          : formatDate(dateForDisplay, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                      </span>
                    )}
                    {r.score != null && <span>· {r.score}</span>}
                  </div>
                )}
                {compact && (r.companyName || r.objectName) && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              <Badge
                variant={STATUS_VARIANT[r.status] ?? "secondary"}
                className="hidden sm:inline-flex"
              >
                {r.status.replace("_", " ")}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
