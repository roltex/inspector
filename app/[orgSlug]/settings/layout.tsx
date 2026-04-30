import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const { t } = await getT();
  const tabs: Array<{ labelKey: string; href: string }> = [
    { labelKey: "nav.overview", href: "" },
    { labelKey: "settings.profile.title", href: "/profile" },
    { labelKey: "nav.members", href: "/members" },
    { labelKey: "nav.billing", href: "/billing" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("common.appTagline")} />
      <div className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/${params.orgSlug}/settings${tab.href}`}
            className={cn(
              "flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
