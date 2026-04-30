import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireMembership } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/admin";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  if (!m) notFound();

  if (m.organization.suspendedAt) {
    const adminBypass = await isSuperAdmin(m.user.id);
    if (!adminBypass) {
      return (
        <main className="min-h-dvh mesh-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <span className="text-2xl">⏸</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Workspace suspended</h1>
              <p className="text-sm text-muted-foreground">
                {m.organization.suspendedReason ??
                  "Access to this workspace is currently suspended. Please contact support for help."}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Back to home
            </Link>
          </div>
        </main>
      );
    }
  }

  return (
    <AppShell
      orgSlug={m.organization.slug}
      orgName={m.organization.name}
      plan={m.organization.plan}
      role={m.role}
      userName={m.user.name ?? m.user.email}
      userEmail={m.user.email}
    >
      {children}
    </AppShell>
  );
}
