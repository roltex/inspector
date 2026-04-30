import {
  Building2,
  CalendarDays,
  Clock,
  ListChecks,
  MapPin,
  StickyNote,
  Target,
  UserCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatRelative } from "@/lib/utils";
import { getT } from "@/lib/i18n";

type StatusEnum =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

interface Props {
  status: StatusEnum;
  notes: string | null;
  scheduledFor: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  score: number | null;
  maxScore: number | null;
  companyName: string | null;
  objectName: string | null;
  objectCity: string | null;
  objectType: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  findingsCount: number;
  checklistDone: number;
  checklistTotal: number;
}

function initials(s: string) {
  const base = s.split("@")[0]!.replace(/[._-]+/g, " ").trim();
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export async function DetailsTab(props: Props) {
  const { t } = await getT();
  const {
    status,
    notes,
    scheduledFor,
    createdAt,
    completedAt,
    updatedAt,
    score,
    maxScore,
    companyName,
    objectName,
    objectCity,
    objectType,
    assigneeName,
    assigneeEmail,
    findingsCount,
    checklistDone,
    checklistTotal,
  } = props;

  const assigneeLabel = assigneeName || assigneeEmail || "—";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("modules.inspections.details")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label={t("modules.inspections.inspector")}
            value={
              <span className="inline-flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {initials(assigneeLabel)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{assigneeLabel}</span>
              </span>
            }
          />
          <Row
            icon={<Building2 className="h-3.5 w-3.5" />}
            label={t("modules.inspections.company")}
            value={companyName ?? "—"}
          />
          {objectName && (
            <Row
              icon={<Target className="h-3.5 w-3.5" />}
              label={t("modules.inspections.object")}
              value={
                <span>
                  {objectName}
                  {objectType && (
                    <span className="text-muted-foreground"> · {objectType}</span>
                  )}
                </span>
              }
            />
          )}
          {objectCity && (
            <Row
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={t("companies.city") || "City"}
              value={objectCity}
            />
          )}
          <Row
            label={t("modules.inspections.status")}
            value={t(`modules.inspections.statusLabel.${status}`)}
          />
          <Row
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label={t("modules.inspections.scheduled")}
            value={
              scheduledFor
                ? formatDate(scheduledFor, {
                    dateStyle: "long",
                    timeStyle: "short",
                  })
                : "—"
            }
          />
          <Row
            label={t("modules.inspections.score")}
            value={
              score != null
                ? maxScore
                  ? `${Math.round(score)} / ${Math.round(maxScore)}`
                  : String(Math.round(score))
                : "—"
            }
          />
          <Row
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label={t("modules.inspections.checklistTitle")}
            value={`${checklistDone} / ${checklistTotal}`}
          />
          <Row
            label={t("modules.inspections.findings")}
            value={String(findingsCount)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("modules.inspections.notes")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {notes && notes.trim().length > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border bg-muted/30 px-3 py-2">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="whitespace-pre-line">{notes}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed px-3 py-3 text-center text-muted-foreground">
              —
            </p>
          )}

          <div className="space-y-1.5 pt-2">
            <Row
              icon={<Clock className="h-3.5 w-3.5" />}
              label={t("modules.inspections.created")}
              value={
                <span className="inline-flex items-center gap-1">
                  <span>{formatDate(createdAt, { dateStyle: "long", timeStyle: "short" })}</span>
                  <span className="text-muted-foreground">· {formatRelative(createdAt)}</span>
                </span>
              }
            />
            <Row
              label={"Updated"}
              value={
                <span className="inline-flex items-center gap-1">
                  <span>{formatDate(updatedAt, { dateStyle: "long", timeStyle: "short" })}</span>
                  <span className="text-muted-foreground">· {formatRelative(updatedAt)}</span>
                </span>
              }
            />
            {completedAt && (
              <Row
                label={t(`modules.inspections.statusLabel.COMPLETED`)}
                value={formatDate(completedAt, {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0.5 border-b py-1.5 last:border-0">
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-medium">{value}</span>
    </div>
  );
}
