"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";
import { createCompany } from "./actions";

const SECTOR_UNCLASSIFIED = "__unclassified__";

interface SectorOption {
  id: string;
  name: string;
  code: string | null;
}

export function CreateCompanyDialog({
  orgSlug,
  sectors = [],
}: {
  orgSlug: string;
  sectors?: SectorOption[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [riskSectorId, setRiskSectorId] = useState<string>(SECTOR_UNCLASSIFIED);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createCompany(orgSlug, {
          name: String(fd.get("name") ?? ""),
          code: String(fd.get("code") ?? ""),
          riskSectorId:
            riskSectorId && riskSectorId !== SECTOR_UNCLASSIFIED
              ? riskSectorId
              : null,
          contactName: String(fd.get("contactName") ?? ""),
          contactEmail: String(fd.get("contactEmail") ?? ""),
          contactPhone: String(fd.get("contactPhone") ?? ""),
          address: String(fd.get("address") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        });
        toast.success(t("modules.companies.created"));
        setOpen(false);
      } catch (err) {
        // Server actions that redirect throw a NEXT_REDIRECT marker — that's a success path.
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-4 w-4" /> {t("modules.companies.new")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("modules.companies.new")}</DialogTitle>
          <DialogDescription>{t("modules.companies.newHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field id="name" label={t("modules.companies.name")} required minLength={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="code" label={t("modules.companies.code")} hint={t("common.optional")} />
            <div className="space-y-1.5">
              <Label htmlFor="riskSectorId">
                {t("modules.companies.riskSector")}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <Select
                value={riskSectorId}
                onValueChange={setRiskSectorId}
                disabled={sectors.length === 0}
              >
                <SelectTrigger id="riskSectorId">
                  <SelectValue
                    placeholder={
                      sectors.length === 0
                        ? t("modules.companies.noSectorsYet")
                        : t("modules.companies.selectSector")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SECTOR_UNCLASSIFIED}>
                    {t("modules.companies.unclassified")}
                  </SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.code ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {s.code}
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="contactName" label={t("modules.companies.contactName")} hint={t("common.optional")} />
            <Field id="contactEmail" label={t("modules.companies.contactEmail")} type="email" hint={t("common.optional")} />
          </div>
          <Field id="contactPhone" label={t("modules.companies.contactPhone")} hint={t("common.optional")} />
          <Field id="address" label={t("modules.companies.address")} hint={t("common.optional")} />
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("modules.companies.notes")}</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} {t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  hint,
  ...rest
}: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-muted-foreground">({hint})</span>}
      </Label>
      <Input id={id} name={id} {...rest} />
    </div>
  );
}
