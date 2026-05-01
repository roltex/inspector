"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";
import { RISK_TONES, type RiskTone } from "@/lib/validators/risk-levels";
import { createRiskLevel, updateRiskLevel } from "./actions";
import { RiskLevelBadge } from "../risk-sectors/sector-badge";

interface LevelShape {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  tone: string;
  score: number;
  sortOrder: number;
  isActive: boolean;
}

export function LevelDialog({
  orgSlug,
  level,
  trigger,
}: {
  orgSlug: string;
  level?: LevelShape;
  trigger?: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const isEdit = !!level;

  const [tone, setTone] = useState<RiskTone>(
    (level?.tone as RiskTone) ?? "muted",
  );
  const [isActive, setIsActive] = useState<boolean>(level?.isActive ?? true);
  const [previewName, setPreviewName] = useState<string>(level?.name ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      code: String(fd.get("code") ?? "").trim() || null,
      description: String(fd.get("description") ?? "").trim() || null,
      tone,
      score: Number(fd.get("score") ?? 0) || 0,
      sortOrder: Number(fd.get("sortOrder") ?? 0) || 0,
      isActive,
    };
    start(async () => {
      try {
        if (isEdit && level) {
          await updateRiskLevel(orgSlug, level.id, payload);
          toast.success(t("modules.riskLevels.updated"));
        } else {
          await createRiskLevel(orgSlug, payload);
          toast.success(t("modules.riskLevels.created"));
        }
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size={isEdit ? "sm" : "lg"} variant={isEdit ? "ghost" : "default"}>
            {isEdit ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> {t("modules.riskLevels.new")}
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modules.riskLevels.edit") : t("modules.riskLevels.new")}
          </DialogTitle>
          <DialogDescription>
            {t("modules.riskLevels.formHint")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("modules.riskLevels.name")}</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={1}
                maxLength={60}
                defaultValue={level?.name ?? ""}
                onChange={(e) => setPreviewName(e.currentTarget.value)}
                placeholder={t("modules.riskLevels.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">
                {t("modules.riskLevels.code")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <Input id="code" name="code" maxLength={12} defaultValue={level?.code ?? ""} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tone">{t("modules.riskLevels.tone")}</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as RiskTone)}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_TONES.map((tk) => (
                    <SelectItem key={tk} value={tk}>
                      <span className="inline-flex items-center gap-2">
                        <RiskLevelBadge
                          tone={tk}
                          label={t(`modules.riskLevels.tones.${tk}`)}
                        />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score">{t("modules.riskLevels.score")}</Label>
              <Input
                id="score"
                name="score"
                type="number"
                min={0}
                max={1000}
                defaultValue={level?.score ?? 0}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              {t("modules.riskLevels.descriptionField")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              maxLength={300}
              defaultValue={level?.description ?? ""}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">{t("modules.riskLevels.sortOrder")}</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                max={10000}
                defaultValue={level?.sortOrder ?? 0}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.currentTarget.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                {t("modules.riskLevels.active")}
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {t("modules.riskLevels.preview")}
            </p>
            <RiskLevelBadge tone={tone} label={previewName || "—"} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
              {isEdit ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
