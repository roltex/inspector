"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { SectorDialog } from "./sector-dialog";
import { deleteRiskSector } from "./actions";
import type { RiskLevel } from "@/lib/validators/risk-sectors";

interface SectorRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  defaultRisk: RiskLevel;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  companyCount: number;
}

export function SectorRowActions({
  orgSlug,
  sector,
}: {
  orgSlug: string;
  sector: SectorRow;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    const prompt =
      sector.companyCount > 0
        ? t("modules.riskSectors.deleteWithCompaniesConfirm", {
            count: sector.companyCount,
          })
        : t("modules.riskSectors.deleteConfirm");
    if (!window.confirm(prompt)) return;
    start(async () => {
      try {
        await deleteRiskSector(orgSlug, sector.id);
        toast.success(t("modules.riskSectors.deleted"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <SectorDialog
        orgSlug={orgSlug}
        initial={sector}
        trigger={
          <Button variant="ghost" size="sm" title={t("common.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        title={t("common.delete")}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </div>
  );
}
