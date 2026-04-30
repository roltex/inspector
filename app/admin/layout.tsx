import { headers } from "next/headers";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

const UNGUARDED = new Set(["/admin/sign-in", "/admin/sign-out"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = headers().get("x-pathname") ?? "";
  if (UNGUARDED.has(path)) {
    return <>{children}</>;
  }
  const admin = await requireSuperAdmin();
  return (
    <AdminShell userName={admin.name} userEmail={admin.email}>
      {children}
    </AdminShell>
  );
}
