"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { deleteFinding } from "../../actions";
import {
  ValueCell,
  type FieldDef,
  type FindingRow,
  type Severity,
} from "../item-findings-section";

type SeverityKey = Severity | "NONE";

const SEVERITY_ORDER: SeverityKey[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
];

const SEVERITY_BADGE: Record<
  Severity,
  "destructive" | "warning" | "secondary" | "default"
> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "secondary",
};

const SEVERITY_TINT: Record<SeverityKey, string> = {
  CRITICAL: "border-destructive/30",
  HIGH: "border-destructive/20",
  MEDIUM: "border-warning/30",
  LOW: "border-input",
  NONE: "border-input",
};

export interface FindingWithMeta extends FindingRow {
  selectionId: string | null;
  itemLabel: string | null;
}

interface Props {
  orgSlug: string;
  fieldsByItemSelectionId: Record<string, FieldDef[]>;
  findings: FindingWithMeta[];
  canEdit: boolean;
}

export function FindingsTab({
  orgSlug,
  fieldsByItemSelectionId,
  findings: initialFindings,
  canEdit,
}: Props) {
  const t = useT();
  const [list, setList] = React.useState(initialFindings);
  const [activeFilter, setActiveFilter] = React.useState<SeverityKey | "all">(
    "all",
  );
  const [pending, start] = useTransition();

  React.useEffect(() => {
    setList(initialFindings);
  }, [initialFindings]);

  function severityOf(f: FindingWithMeta): SeverityKey {
    return (f.severity as Severity) || "NONE";
  }

  const filtered = React.useMemo(() => {
    if (activeFilter === "all") return list;
    return list.filter((f) => severityOf(f) === activeFilter);
  }, [list, activeFilter]);

  // Group by severity, preserving the insertion order set by SEVERITY_ORDER.
  const groups = React.useMemo(() => {
    const map = new Map<SeverityKey, FindingWithMeta[]>();
    for (const f of filtered) {
      const k = severityOf(f);
      const arr = map.get(k) ?? [];
      arr.push(f);
      map.set(k, arr);
    }
    return SEVERITY_ORDER
      .map((k) => [k, map.get(k) ?? []] as const)
      .filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  function onDelete(id: string) {
    if (!confirm(t("modules.inspections.findingDeleteConfirm"))) return;
    start(async () => {
      try {
        await deleteFinding(orgSlug, id);
        setList((prev) => prev.filter((f) => f.id !== id));
        toast.success(t("modules.inspections.findingDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("modules.inspections.findingsEmpty")}
        </CardContent>
      </Card>
    );
  }

  // Severity filter chips with counts.
  const counts: Record<SeverityKey, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    NONE: 0,
  };
  for (const f of list) counts[severityOf(f)]++;

  return (
    <div className="space-y-4">
      {/* Severity filter chips */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        <Chip
          active={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
        >
          {t("modules.inspections.filterAllSeverities")} · {list.length}
        </Chip>
        {SEVERITY_ORDER.map((k) => {
          const c = counts[k];
          if (c === 0) return null;
          return (
            <Chip
              key={k}
              active={activeFilter === k}
              onClick={() => setActiveFilter(k)}
              tone={
                k === "CRITICAL" || k === "HIGH"
                  ? "destructive"
                  : k === "MEDIUM"
                    ? "warning"
                    : "default"
              }
            >
              {k === "NONE"
                ? t("modules.inspections.noSeverity")
                : t(`modules.inspections.severityLabel.${k}`)}{" "}
              · {c}
            </Chip>
          );
        })}
      </div>

      {/* Severity groups */}
      {groups.map(([key, items]) => (
        <Card key={key} className={cn("overflow-hidden", SEVERITY_TINT[key])}>
          <CardHeader className="border-b px-4 py-2.5 sm:px-5">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle
                  className={cn(
                    "h-4 w-4",
                    (key === "CRITICAL" || key === "HIGH") && "text-destructive",
                    key === "MEDIUM" && "text-warning",
                  )}
                />
                {key === "NONE"
                  ? t("modules.inspections.noSeverity")
                  : t(`modules.inspections.severityLabel.${key}`)}
              </span>
              <span className="text-xs font-normal tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 sm:p-4">
            {items.map((f) => {
              const fields = f.selectionId
                ? fieldsByItemSelectionId[f.selectionId] ?? []
                : [];
              return (
                <div
                  key={f.id}
                  className="rounded-xl border bg-card p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    {f.severity && (
                      <Badge
                        variant={SEVERITY_BADGE[f.severity]}
                        className="uppercase"
                      >
                        {t(`modules.inspections.severityLabel.${f.severity}`)}
                      </Badge>
                    )}
                    {f.itemLabel ? (
                      <a
                        href={`?tab=checklist#item-${f.selectionId ?? ""}`}
                        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        {f.itemLabel}
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {f.description || t("modules.inspections.findings")}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(f.createdAt, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  {fields.length > 0 ? (
                    <dl className="mt-3 grid gap-x-4 gap-y-3 lg:grid-cols-2">
                      {fields.map((fd) => {
                        const value = (f.values ?? {})[fd.key];
                        if (value == null || value === "") return null;
                        const isRowBacked =
                          fd.type === "repeatable" || fd.type === "table";
                        return (
                          <div
                            key={fd.id}
                            className={cn(
                              "min-w-0 text-sm",
                              isRowBacked
                                ? "space-y-1.5 lg:col-span-2"
                                : "space-y-1 sm:grid sm:grid-cols-[120px_1fr] sm:items-baseline sm:gap-2 sm:space-y-0",
                            )}
                          >
                            <dt className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {fd.label}
                            </dt>
                            <dd className="m-0 min-w-0 break-words">
                              <ValueCell field={fd} value={value} />
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : f.description ? (
                    <p className="mt-2 text-sm">{f.description}</p>
                  ) : null}

                  {canEdit && (
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(f.id)}
                        disabled={pending}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "destructive" | "warning";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? tone === "destructive"
            ? "border-destructive bg-destructive text-destructive-foreground"
            : tone === "warning"
              ? "border-warning bg-warning text-warning-foreground"
              : "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
