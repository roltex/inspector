"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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
import { useT } from "@/components/i18n-provider";
import { createRiskSector, updateRiskSector } from "./actions";

interface SectorFormValues {
  id?: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function SectorDialog({
  orgSlug,
  initial,
  trigger,
}: {
  orgSlug: string;
  initial?: SectorFormValues;
  trigger?: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const isEdit = Boolean(initial?.id);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      code: String(fd.get("code") ?? "") || null,
      description: String(fd.get("description") ?? "") || null,
      color: String(fd.get("color") ?? "") || null,
      sortOrder: Number(fd.get("sortOrder") ?? 0),
      isActive: fd.get("isActive") === "on",
    };
    start(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateRiskSector(orgSlug, initial.id, payload);
          toast.success(t("modules.riskSectors.updated"));
        } else {
          await createRiskSector(orgSlug, payload);
          toast.success(t("modules.riskSectors.created"));
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <Plus className="h-4 w-4" />
            {t("modules.riskSectors.new")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modules.riskSectors.edit") : t("modules.riskSectors.new")}
          </DialogTitle>
          <DialogDescription>
            {t("modules.riskSectors.formHint")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("modules.riskSectors.name")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={initial?.name ?? ""}
                required
                minLength={2}
                maxLength={120}
                placeholder={t("modules.riskSectors.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">
                {t("modules.riskSectors.code")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={initial?.code ?? ""}
                maxLength={12}
                placeholder="CON"
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              {t("modules.riskSectors.descriptionField")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">
                {t("modules.inspectionItems.sortOrder")}
              </Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={initial?.sortOrder ?? 0}
              />
            </div>
            <label className="flex items-end gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="h-4 w-4 rounded border-input"
              />
              {t("modules.riskSectors.active")}
            </label>
          </div>

          {/* Hidden for now — intentionally kept in the form so adding a
              colour picker later requires no schema change. */}
          <input
            type="hidden"
            name="color"
            defaultValue={initial?.color ?? ""}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
