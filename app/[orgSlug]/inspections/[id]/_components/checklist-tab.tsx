"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n-provider";
import { ItemAccordion } from "../item-accordion";
import type {
  FieldDef,
  FindingRow,
} from "../item-findings-section";

export interface ChecklistItem {
  id: string;
  itemId: string | null;
  category: string;
  label: string;
  checked: boolean;
  sortOrder: number;
}

interface Props {
  orgSlug: string;
  organizationId: string;
  inspectionId: string;
  items: ChecklistItem[];
  fieldsByItemId: Record<string, FieldDef[]>;
  findingsBySelectionId: Record<string, FindingRow[]>;
  canEdit: boolean;
}

type Filter = "all" | "pending" | "withFindings" | "completed";

export function ChecklistTab({
  orgSlug,
  organizationId,
  inspectionId,
  items,
  fieldsByItemId,
  findingsBySelectionId,
  canEdit,
}: Props) {
  const t = useT();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter((i) => {
      if (ql && !i.label.toLowerCase().includes(ql)) return false;
      const findings = findingsBySelectionId[i.id] ?? [];
      switch (filter) {
        case "pending":
          return !i.checked;
        case "withFindings":
          return findings.length > 0;
        case "completed":
          return i.checked;
        case "all":
        default:
          return true;
      }
    });
  }, [items, filter, q, findingsBySelectionId]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const it of filtered) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const filterChips: { id: Filter; label: string }[] = [
    { id: "all", label: t("modules.inspections.checklistFilter.all") },
    { id: "pending", label: t("modules.inspections.checklistFilter.pending") },
    {
      id: "withFindings",
      label: t("modules.inspections.checklistFilter.withFindings"),
    },
    { id: "completed", label: t("modules.inspections.checklistFilter.completed") },
  ];

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("modules.inspections.noChecklist")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Inner toolbar — sticky only on lg+ so mobile/tablet keep their real estate */}
      <div className="space-y-2 lg:sticky lg:top-[7.5rem] lg:z-[5] lg:-mx-3 lg:rounded-2xl lg:border lg:bg-background/85 lg:p-2 lg:backdrop-blur">
        {/* Search + progress (one row, always) */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("modules.inspections.checklistSearchPlaceholder")}
              className="h-9 pl-9 pr-8 text-sm"
            />
            {q.length > 0 && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Compact progress chip */}
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[11px] font-medium tabular-nums"
            title={`${checkedCount} / ${totalCount}`}
          >
            <span className="relative hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:block">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-[width]",
                  pct === 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={cn(pct === 100 && "text-success")}>
              {checkedCount}/{totalCount}
            </span>
          </span>
        </div>

        {/* Filter chips */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {filterChips.map((c) => {
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:text-xs",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("modules.inspections.noItemsMatch")}
          </CardContent>
        </Card>
      ) : (
        grouped.map(([category, list]) => (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-4 py-2.5 sm:px-5">
              <CardTitle className="flex items-center justify-between text-sm font-semibold">
                <span>{category}</span>
                <span className="text-xs font-normal tabular-nums text-muted-foreground">
                  {list.filter((i) => i.checked).length}/{list.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {list.map((s) => (
                  <ItemAccordion
                    key={s.id}
                    orgSlug={orgSlug}
                    organizationId={organizationId}
                    inspectionId={inspectionId}
                    selectionId={s.id}
                    label={s.label}
                    checked={s.checked}
                    fields={(s.itemId && fieldsByItemId[s.itemId]) || []}
                    findings={findingsBySelectionId[s.id] ?? []}
                    canEdit={canEdit}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
