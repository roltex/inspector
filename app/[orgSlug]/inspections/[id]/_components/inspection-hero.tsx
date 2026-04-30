import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ListChecks,
  StickyNote,
  Target,
  UserCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { getT } from "@/lib/i18n";

type StatusEnum =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type SeverityEnum = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const STATUS_BADGE: Record<
  StatusEnum,
  "success" | "destructive" | "warning" | "secondary"
> = {
  COMPLETED: "success",
  FAILED: "destructive",
  IN_PROGRESS: "warning",
  SCHEDULED: "secondary",
  DRAFT: "secondary",
  CANCELLED: "secondary",
};

const SEVERITY_TINT: Record<SeverityEnum, string> = {
  CRITICAL: "bg-destructive text-destructive-foreground",
  HIGH: "bg-destructive/80 text-destructive-foreground",
  MEDIUM: "bg-warning text-warning-foreground",
  LOW: "bg-muted text-foreground",
};

interface Props {
  title: string;
  status: StatusEnum;
  notes: string | null;
  scheduledFor: Date | null;
  createdAt: Date;
  score: number | null;
  maxScore: number | null;
  companyName: string | null;
  objectName: string | null;
  objectCity: string | null;
  objectType: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  checklistDone: number;
  checklistTotal: number;
  findingsCount: number;
  maxSeverity: SeverityEnum | null;
}

function initials(s: string) {
  const base = s.split("@")[0]!.replace(/[._-]+/g, " ").trim();
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export async function InspectionHero(props: Props) {
  const { t } = await getT();
  const {
    title,
    status,
    notes,
    scheduledFor,
    score,
    maxScore,
    companyName,
    objectName,
    objectCity,
    objectType,
    assigneeName,
    assigneeEmail,
    checklistDone,
    checklistTotal,
    findingsCount,
    maxSeverity,
  } = props;

  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const scorePct = (() => {
    if (score == null) return null;
    if (maxScore && maxScore > 0) return Math.round((score / maxScore) * 100);
    return null;
  })();
  const assigneeLabel = assigneeName || assigneeEmail || "—";

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3 sm:space-y-5 sm:p-5">
        {/* Title row */}
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-lg font-semibold leading-tight tracking-tight sm:text-2xl">
            {title}
          </h1>
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
            <Badge variant={STATUS_BADGE[status]} className="uppercase">
              {t(`modules.inspections.statusLabel.${status}`)}
            </Badge>
            {maxSeverity && findingsCount > 0 && (
              <Badge
                className={cn(
                  "border-transparent uppercase",
                  SEVERITY_TINT[maxSeverity],
                )}
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                {t(`modules.inspections.severityLabel.${maxSeverity}`)}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid gap-2.5 sm:gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Stat
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label={t("modules.inspections.inspector")}
            value={
              <span className="inline-flex min-w-0 items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {initials(assigneeLabel)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{assigneeLabel}</span>
              </span>
            }
          />
          <Stat
            icon={<Building2 className="h-3.5 w-3.5" />}
            label={t("modules.inspections.company")}
            value={
              <span className="truncate" title={companyName ?? ""}>
                {companyName ?? "—"}
              </span>
            }
          />
          <Stat
            icon={<Target className="h-3.5 w-3.5" />}
            label={t("modules.inspections.object")}
            value={
              <span className="truncate" title={objectName ?? ""}>
                {objectName ?? "—"}
                {objectType ? <span className="text-muted-foreground"> · {objectType}</span> : null}
                {objectCity ? <span className="text-muted-foreground"> · {objectCity}</span> : null}
              </span>
            }
          />
          <Stat
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label={t("modules.inspections.scheduled")}
            value={
              scheduledFor
                ? formatDate(scheduledFor, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"
            }
          />
          <Stat
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label={t("modules.inspections.checklistTitle")}
            value={
              checklistTotal > 0 ? (
                <span className="space-y-1.5 block w-full">
                  <span className="block text-sm font-medium tabular-nums">
                    {checklistDone}
                    <span className="text-muted-foreground">
                      /{checklistTotal}
                    </span>
                  </span>
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-[width]",
                        checklistPct === 100 ? "bg-success" : "bg-primary",
                      )}
                      style={{ width: `${checklistPct}%` }}
                    />
                  </span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Stat
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label={t("modules.inspections.findings")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    findingsCount === 0
                      ? "bg-success/70"
                      : maxSeverity
                        ? "bg-destructive"
                        : "bg-muted-foreground/40",
                  )}
                />
                <span className="tabular-nums">{findingsCount}</span>
                {scorePct != null && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {t("modules.inspections.score")} {Math.round(score!)}
                    {maxScore ? `/${Math.round(maxScore)}` : ""}
                  </span>
                )}
              </span>
            }
          />
        </div>

        {/* Notes callout */}
        {notes && notes.trim().length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="whitespace-pre-line">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="min-w-0 text-sm font-medium">{value}</div>
    </div>
  );
}
