"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import { toggleInspectionItemSelection } from "../actions";
import {
  ItemFindingsSection,
  type FieldDef,
  type FindingRow,
  type Severity,
} from "./item-findings-section";

const SEVERITY_RANK: Record<Severity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const SEVERITY_DOT: Record<Severity, string> = {
  CRITICAL: "bg-destructive",
  HIGH: "bg-destructive/70",
  MEDIUM: "bg-warning",
  LOW: "bg-muted-foreground/40",
};

const SEVERITY_BADGE: Record<Severity, string> = {
  CRITICAL: "bg-destructive/15 text-destructive",
  HIGH: "bg-destructive/10 text-destructive",
  MEDIUM: "bg-warning/15 text-warning-foreground",
  LOW: "bg-muted text-foreground",
};

function maxSeverityOf(findings: FindingRow[]): Severity | null {
  let best: Severity | null = null;
  for (const f of findings) {
    if (!f.severity) continue;
    if (!best || SEVERITY_RANK[f.severity] > SEVERITY_RANK[best]) {
      best = f.severity;
    }
  }
  return best;
}

export function ItemAccordion({
  orgSlug,
  organizationId,
  inspectionId,
  selectionId,
  label,
  checked,
  fields,
  findings,
  canEdit,
  defaultOpen = false,
}: {
  orgSlug: string;
  organizationId: string;
  inspectionId: string;
  selectionId: string;
  label: string;
  checked: boolean;
  fields: FieldDef[];
  findings: FindingRow[];
  canEdit: boolean;
  defaultOpen?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen || findings.length > 0);
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(checked);
  const [, start] = useTransition();
  const maxSev = maxSeverityOf(findings);

  function onToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    start(async () => {
      setOptimisticChecked(next);
      await toggleInspectionItemSelection(orgSlug, inspectionId, selectionId, next);
    });
  }

  return (
    <li id={`item-${selectionId}`} className="overflow-hidden">
      <div
        className={cn(
          "relative flex min-h-11 items-center gap-3 px-3 py-2 transition sm:px-4",
          optimisticChecked && "bg-success/5",
          maxSev === "CRITICAL" && "bg-destructive/5",
        )}
      >
        {/* status accent bar (left edge) */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1.5 left-0 w-0.5 rounded-r-full",
            optimisticChecked
              ? "bg-success"
              : maxSev === "CRITICAL" || maxSev === "HIGH"
                ? "bg-destructive"
                : maxSev === "MEDIUM"
                  ? "bg-warning"
                  : "bg-transparent",
          )}
        />

        <label className="relative inline-flex shrink-0 cursor-pointer items-center justify-center p-1">
          <input
            type="checkbox"
            checked={optimisticChecked}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 cursor-pointer rounded border-input text-primary focus:ring-2 focus:ring-ring"
            aria-label={t("modules.inspections.markComplete")}
          />
        </label>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {/* severity dot */}
          {maxSev && (
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                SEVERITY_DOT[maxSev],
              )}
              title={t(`modules.inspections.severityLabel.${maxSev}`)}
            />
          )}
          <span
            className={cn(
              "flex-1 text-sm",
              optimisticChecked && "text-muted-foreground line-through",
            )}
          >
            {label}
          </span>
          {findings.length > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                maxSev ? SEVERITY_BADGE[maxSev] : "bg-muted text-muted-foreground",
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {findings.length}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {open && (
        <div className="border-t bg-muted/10 px-3 py-3 sm:px-4">
          <ItemFindingsSection
            orgSlug={orgSlug}
            organizationId={organizationId}
            inspectionId={inspectionId}
            selectionId={selectionId}
            itemLabel={label}
            fields={fields}
            findings={findings}
            canEdit={canEdit}
          />
        </div>
      )}
    </li>
  );
}
