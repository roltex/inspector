import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const settings = await getSettings();
  return (
    <main className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="text-3xl">🛠</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">We&apos;ll be right back</h1>
          <p className="text-muted-foreground leading-relaxed">{settings.maintenanceMessage}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Need help?{" "}
          <Link href={`mailto:${settings.supportEmail}`} className="underline">
            {settings.supportEmail}
          </Link>
        </div>
      </div>
    </main>
  );
}
