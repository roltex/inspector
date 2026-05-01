"use client";

import { useState } from "react";
import { Globe2, Target } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n-provider";
import { RiskLevelBadge } from "../risk-sectors/sector-badge";

interface ApplicabilityDetail {
  riskSectorId: string;
  riskSectorName: string;
  riskLevelId: string;
  riskLevelName: string;
  riskLevelTone: string;
}

/**
 * Compact chip on the forms list that tells at a glance whether a form is
 * surfaced everywhere ("always") or only for specific inspect-item × risk-
 * level combinations. Clicking the chip opens a popover listing every
 * pairing grouped by inspect item.
 */
export function ApplicabilitySummary({ pairs }: { pairs: ApplicabilityDetail[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (pairs.length === 0) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 rounded-full border-transparent bg-muted/60 px-2 py-0 font-normal text-muted-foreground"
        title={t("modules.inspectionItems.applicability.alwaysTooltip")}
      >
        <Globe2 className="h-3 w-3" />
        {t("modules.inspectionItems.applicability.alwaysLabel")}
      </Badge>
    );
  }

  const bySector = new Map<
    string,
    { name: string; levels: ApplicabilityDetail[] }
  >();
  for (const p of pairs) {
    const bucket = bySector.get(p.riskSectorId) ?? {
      name: p.riskSectorName,
      levels: [],
    };
    bucket.levels.push(p);
    bySector.set(p.riskSectorId, bucket);
  }
  const sectors = [...bySector.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <Target className="h-3 w-3" />
          {t("modules.inspectionItems.applicability.pairsCount", {
            count: pairs.length,
          })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("modules.inspectionItems.applicability.popoverTitle")}
          </p>
        </div>
        <ul className="max-h-72 divide-y overflow-auto">
          {sectors.map((s) => (
            <li key={s.name} className="space-y-1 px-3 py-2">
              <p className="text-sm font-medium">{s.name}</p>
              <div className="flex flex-wrap gap-1">
                {s.levels
                  .slice()
                  .sort((a, b) => a.riskLevelName.localeCompare(b.riskLevelName))
                  .map((lv) => (
                    <RiskLevelBadge
                      key={lv.riskLevelId}
                      tone={lv.riskLevelTone}
                      label={lv.riskLevelName}
                    />
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
