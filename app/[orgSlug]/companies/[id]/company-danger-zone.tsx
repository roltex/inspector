"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/i18n-provider";
import { deleteCompany } from "../actions";

export function CompanyDangerZone({
  orgSlug,
  companyId,
}: {
  orgSlug: string;
  companyId: string;
}) {
  const t = useT();
  const [pending, start] = useTransition();

  function handleDelete() {
    if (!confirm(t("modules.companies.deleteConfirm"))) return;
    start(async () => {
      try {
        await deleteCompany(orgSlug, companyId);
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          {t("modules.companies.dangerZone")}
        </CardTitle>
        <CardDescription>{t("modules.companies.dangerZoneHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={handleDelete} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {t("modules.companies.deleteCompany")}
        </Button>
      </CardContent>
    </Card>
  );
}
