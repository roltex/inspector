"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { deleteRiskLevel } from "./actions";
import { LevelDialog } from "./level-dialog";

interface LevelShape {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  tone: string;
  score: number;
  sortOrder: number;
  isActive: boolean;
  sectorCount: number;
}

export function LevelRowActions({
  orgSlug,
  level,
}: {
  orgSlug: string;
  level: LevelShape;
}) {
  const t = useT();
  const [pending, start] = useTransition();

  function onDelete() {
    const message =
      level.sectorCount > 0
        ? t("modules.riskLevels.deleteWithSectorsConfirm", {
            count: level.sectorCount,
          })
        : t("modules.riskLevels.deleteConfirm");
    if (!confirm(message)) return;
    start(async () => {
      try {
        await deleteRiskLevel(orgSlug, level.id);
        toast.success(t("modules.riskLevels.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <LevelDialog orgSlug={orgSlug} level={level} />
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        disabled={pending}
        title={t("common.delete")}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
