import { requireMembership } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlan } from "@/lib/billing/plans";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Workspace settings" };
export const dynamic = "force-dynamic";

export default async function SettingsHome({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const plan = await getPlan(m.organization.plan);
  const { t, locale } = await getT();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{t("settings.workspace.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label={t("settings.workspace.name")} value={m.organization.name} />
          <Row label={t("settings.workspace.slug")} value={m.organization.slug} />
          <Row
            label={t("settings.workspace.created")}
            value={m.organization.createdAt.toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US")}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("settings.plan.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label={t("settings.plan.currentPlan")} value={plan.name} />
          <Row label={t("settings.plan.userLimit")} value={plan.userLimit.toString()} />
          <Row label={t("settings.plan.storageLimit")} value={`${plan.storageLimitGB} GB`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
