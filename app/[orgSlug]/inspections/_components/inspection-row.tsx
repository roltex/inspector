import Link from "next/link";
import { AlertTriangle, Calendar, ListChecks, MapPin } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type StatusEnum =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type SeverityEnum = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface InspectionRowData {
  id: string;
  orgSlug: string;
  title: string;
  status: StatusEnum;
  score: number | null;
  maxScore: number | null;
  scheduledFor: string | null;
  createdAt: string;
  companyName: string | null;
  objectName: string | null;
  objectCity: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  checklistTotal: number;
  checklistDone: number;
  findingsCount: number;
  maxSeverity: SeverityEnum | null;
}

const STATUS_ACCENT: Record<StatusEnum, string> = {
  COMPLETED: "bg-success",
  FAILED: "bg-destructive",
  IN_PROGRESS: "bg-warning",
  SCHEDULED: "bg-primary/60",
  DRAFT: "bg-muted-foreground/40",
  CANCELLED: "bg-muted-foreground/30",
};

const STATUS_BADGE: Record<StatusEnum, "success" | "destructive" | "warning" | "secondary"> = {
  COMPLETED: "success",
  FAILED: "destructive",
  IN_PROGRESS: "warning",
  SCHEDULED: "secondary",
  DRAFT: "secondary",
  CANCELLED: "secondary",
};

const SEVERITY_TINT: Record<SeverityEnum, string> = {
  CRITICAL: "bg-destructive/15 text-destructive",
  HIGH: "bg-destructive/10 text-destructive",
  MEDIUM: "bg-warning/15 text-warning-foreground",
  LOW: "bg-muted text-muted-foreground",
};

function initials(nameOrEmail: string): string {
  const base = nameOrEmail.split("@")[0]!.replace(/[._-]+/g, " ").trim();
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function relativeOrShort(d: Date) {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const tomorrow0 = new Date(today0);
  tomorrow0.setDate(tomorrow0.getDate() + 1);
  const dayAfter0 = new Date(tomorrow0);
  dayAfter0.setDate(dayAfter0.getDate() + 1);
  const time = formatDate(d, { hour: "2-digit", minute: "2-digit" });
  if (d >= today0 && d < tomorrow0) return `Today · ${time}`;
  if (d >= tomorrow0 && d < dayAfter0) return `Tomorrow · ${time}`;
  return formatDate(d, { dateStyle: "medium", timeStyle: "short" });
}

export function InspectionRow({
  i,
  showAssignee,
  statusLabel,
}: {
  i: InspectionRowData;
  showAssignee: boolean;
  statusLabel: string;
}) {
  const subtitle = [i.companyName, i.objectName].filter(Boolean).join(" · ");
  const sched = i.scheduledFor ? new Date(i.scheduledFor) : null;
  const checklistPct =
    i.checklistTotal > 0 ? Math.round((i.checklistDone / i.checklistTotal) * 100) : 0;
  const assigneeLabel = i.assigneeName || i.assigneeEmail || "";

  return (
    <Link
      href={`/${i.orgSlug}/inspections/${i.id}`}
      className="group relative flex items-start gap-3 px-4 py-3 transition hover:bg-muted/50 sm:items-center sm:px-5"
    >
      {/* status accent */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 w-1 rounded-r-full",
          STATUS_ACCENT[i.status],
        )}
      />

      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium sm:text-[0.95rem]">
            {i.title}
          </p>
          <Badge variant={STATUS_BADGE[i.status]} className="sm:hidden">
            {statusLabel}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {subtitle && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="truncate max-w-[16rem]">{subtitle}</span>
            </span>
          )}
          {i.objectCity && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {i.objectCity}
            </span>
          )}
          {sched && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {relativeOrShort(sched)}
            </span>
          )}
          {showAssignee && assigneeLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[9px]">
                  {initials(assigneeLabel)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[8rem]">{assigneeLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right side chips */}
      <div className="flex shrink-0 items-center gap-2">
        {i.checklistTotal > 0 && (
          <span
            className={cn(
              "hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums sm:inline-flex",
              checklistPct === 100 && "bg-success/15 text-success",
            )}
            title={`${i.checklistDone}/${i.checklistTotal}`}
          >
            <ListChecks className="h-3 w-3" />
            {i.checklistDone}/{i.checklistTotal}
          </span>
        )}
        {i.findingsCount > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              i.maxSeverity ? SEVERITY_TINT[i.maxSeverity] : "bg-muted text-muted-foreground",
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            {i.findingsCount}
          </span>
        )}
        <Badge variant={STATUS_BADGE[i.status]} className="hidden sm:inline-flex">
          {statusLabel}
        </Badge>
      </div>
    </Link>
  );
}
