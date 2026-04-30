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
import { useT } from "@/components/i18n-provider";
import { createCompanyObject } from "../actions";

export function CreateObjectDialog({
  orgSlug,
  companyId,
}: {
  orgSlug: string;
  companyId: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createCompanyObject(orgSlug, {
          companyId,
          name: String(fd.get("name") ?? ""),
          code: String(fd.get("code") ?? ""),
          type: String(fd.get("type") ?? ""),
          address: String(fd.get("address") ?? ""),
          city: String(fd.get("city") ?? ""),
          country: String(fd.get("country") ?? ""),
          managerName: String(fd.get("managerName") ?? ""),
          managerEmail: String(fd.get("managerEmail") ?? ""),
          managerPhone: String(fd.get("managerPhone") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        });
        toast.success(t("modules.companies.objectCreated"));
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("modules.companies.addObject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("modules.companies.addObject")}</DialogTitle>
          <DialogDescription>{t("modules.companies.addObjectHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="name" label={t("modules.companies.objectName")} required minLength={2} />
            <Field id="type" label={t("modules.companies.objectType")} placeholder={t("modules.companies.objectTypePlaceholder")} hint={t("common.optional")} />
          </div>
          <Field id="code" label={t("modules.companies.code")} hint={t("common.optional")} />
          <Field id="address" label={t("modules.companies.address")} hint={t("common.optional")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="city" label={t("modules.companies.city")} hint={t("common.optional")} />
            <Field id="country" label={t("modules.companies.country")} hint={t("common.optional")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="managerName" label={t("modules.companies.managerName")} hint={t("common.optional")} />
            <Field id="managerPhone" label={t("modules.companies.managerPhone")} hint={t("common.optional")} />
          </div>
          <Field id="managerEmail" label={t("modules.companies.managerEmail")} type="email" hint={t("common.optional")} />
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("modules.companies.notes")}</Label>
            <Textarea id="notes" name="notes" rows={2} />
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
