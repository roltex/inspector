import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        description="Global settings applied to every tenant unless overridden."
      />
      <SettingsForm initial={settings} />
    </div>
  );
}
