import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getT } from "@/lib/i18n";
import { AdminSignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin sign-in" };

type Search = { next?: string | string[] };

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const nextRaw = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
  const next = nextRaw && nextRaw.startsWith("/admin") ? nextRaw : "/admin";

  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/admin/sign-in?next=${next}`)}`);
  }

  const { t } = await getT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">{t("auth.admin.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("auth.admin.subtitle")}</p>
            </div>
          </div>

          <div className="mb-5 rounded-2xl bg-muted/40 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.admin.signedInAs")}</div>
            <div className="mt-0.5 font-medium">{session.user.name || session.user.email}</div>
            <div className="text-xs text-muted-foreground">{session.user.email}</div>
          </div>

          <AdminSignInForm next={next} />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("auth.admin.ttlHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
