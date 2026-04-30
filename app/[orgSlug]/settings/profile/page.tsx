import { requireMembership } from "@/lib/auth/session";
import { getT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/locale-switcher";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.title")}</CardTitle>
          <CardDescription>{m.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Row label={t("settings.profile.name")} value={m.user.name ?? ""} />
          <Row label={t("settings.profile.email")} value={m.user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.language")}</CardTitle>
          <CardDescription>{t("settings.profile.languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleSwitcher variant="outline" align="start" />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
