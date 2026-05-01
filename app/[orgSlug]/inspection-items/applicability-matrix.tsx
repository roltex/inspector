"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Gauge, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { RiskLevelBadge } from "../risk-sectors/sector-badge";
import type { ApplicabilityPair } from "@/lib/validators/inspection-items";

export interface SectorChoice {
  id: string;
  name: string;
  code: string | null;
}

export interface LevelChoice {
  id: string;
  name: string;
  code: string | null;
  tone: string;
  score: number;
}

/**
 * A compact row × column matrix for picking applicability pairs. Rows are
 * inspect items, columns are risk levels; each cell is a checkbox for the
 * (row × column) combination. An empty matrix means "surface this form
 * unconditionally" — the header copy calls that out so an empty selection
 * isn't mistaken for forgetting to configure.
 */
export function ApplicabilityMatrix({
  orgSlug,
  sectors,
  levels,
  value,
  onChange,
}: {
  orgSlug: string;
  sectors: SectorChoice[];
  levels: LevelChoice[];
  value: ApplicabilityPair[];
  onChange: (next: ApplicabilityPair[]) => void;
}) {
  const t = useT();

  const selected = useMemo(() => {
    const set = new Set<string>();
    for (const p of value) set.add(`${p.riskSectorId}|${p.riskLevelId}`);
    return set;
  }, [value]);

  function pairsFrom(set: Set<string>): ApplicabilityPair[] {
    const next: ApplicabilityPair[] = [];
    for (const key of set) {
      const [riskSectorId, riskLevelId] = key.split("|");
      if (riskSectorId && riskLevelId) next.push({ riskSectorId, riskLevelId });
    }
    return next;
  }

  function toggleCell(sectorId: string, levelId: string) {
    const key = `${sectorId}|${levelId}`;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(pairsFrom(next));
  }

  function selectAllInRow(sectorId: string) {
    const next = new Set(selected);
    for (const lv of levels) next.add(`${sectorId}|${lv.id}`);
    onChange(pairsFrom(next));
  }

  function clearRow(sectorId: string) {
    const next = new Set(selected);
    for (const lv of levels) next.delete(`${sectorId}|${lv.id}`);
    onChange(pairsFrom(next));
  }

  function selectAll() {
    const next = new Set<string>();
    for (const s of sectors) for (const lv of levels) next.add(`${s.id}|${lv.id}`);
    onChange(pairsFrom(next));
  }

  function clearAll() {
    onChange([]);
  }

  if (sectors.length === 0 || levels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm">
        <p className="font-medium">
          {t("modules.inspectionItems.applicability.needSeeds")}
        </p>
        <p className="mt-1 text-muted-foreground">
          {t("modules.inspectionItems.applicability.needSeedsHint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sectors.length === 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${orgSlug}/risk-sectors`}>
                <ShieldAlert className="h-4 w-4" />
                {t("modules.inspectionItems.applicability.openSectors")}
              </Link>
            </Button>
          )}
          {levels.length === 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${orgSlug}/risk-levels`}>
                <Gauge className="h-4 w-4" />
                {t("modules.inspectionItems.applicability.openLevels")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {value.length === 0
            ? t("modules.inspectionItems.applicability.unboundedHint")
            : t("modules.inspectionItems.applicability.boundedHint", {
                count: value.length,
              })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="h-7 px-2 text-xs"
          >
            {t("modules.inspectionItems.applicability.selectAll")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 px-2 text-xs"
          >
            {t("modules.inspectionItems.applicability.clearAll")}
          </Button>
        </div>
      </div>

      <div className="max-h-[42vh] overflow-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
            <tr className="border-b">
              <th
                scope="col"
                className="sticky left-0 z-20 bg-background/95 p-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur"
              >
                {t("modules.inspectionItems.applicability.rowHeading")}
              </th>
              {levels.map((lv) => (
                <th
                  key={lv.id}
                  scope="col"
                  className="whitespace-nowrap p-2 text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    <RiskLevelBadge tone={lv.tone} label={lv.name} />
                    {lv.code ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {lv.code}
                      </span>
                    ) : null}
                  </div>
                </th>
              ))}
              <th scope="col" className="w-[1%] p-2 text-right">
                <span className="sr-only">
                  {t("modules.inspectionItems.applicability.rowActionsLabel")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => {
              const rowCount = levels.reduce(
                (sum, lv) => sum + (selected.has(`${s.id}|${lv.id}`) ? 1 : 0),
                0,
              );
              const allInRow = rowCount === levels.length;
              return (
                <tr
                  key={s.id}
                  className={cn(
                    "border-b last:border-b-0",
                    rowCount > 0 && "bg-primary/[0.03]",
                  )}
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-inherit p-2 text-left font-medium"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate">{s.name}</span>
                      {s.code ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {s.code}
                        </span>
                      ) : null}
                    </div>
                  </th>
                  {levels.map((lv) => {
                    const key = `${s.id}|${lv.id}`;
                    const checked = selected.has(key);
                    return (
                      <td key={lv.id} className="p-2 text-center">
                        <label
                          className={cn(
                            "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background hover:bg-muted",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleCell(s.id, lv.id)}
                            aria-label={`${s.name} · ${lv.name}`}
                          />
                          {checked ? (
                            <svg
                              aria-hidden
                              viewBox="0 0 20 20"
                              className="h-3.5 w-3.5 fill-none stroke-current"
                              strokeWidth={3}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 10.5 8.5 14 15 7" />
                            </svg>
                          ) : null}
                        </label>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap p-1 text-right">
                    {allInRow ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearRow(s.id)}
                        className="h-7 px-2 text-xs"
                      >
                        {t("modules.inspectionItems.applicability.clearRow")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => selectAllInRow(s.id)}
                        className="h-7 px-2 text-xs"
                      >
                        {t("modules.inspectionItems.applicability.selectRow")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="secondary" className="font-normal">
          {t("modules.inspectionItems.applicability.selectedCount", {
            count: value.length,
          })}
        </Badge>
      </div>
    </div>
  );
}
