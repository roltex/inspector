import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/admin";

const ALLOWED_PREFIXES = [
  "/maintenance",
  "/admin",
  "/api",
  "/sign-in",
  "/sign-up",
  "/_next",
  "/icons",
  "/manifest",
];

/**
 * When platform-wide maintenance mode is on, render the children only for
 * super-admins; everyone else is redirected to /maintenance. Static asset and
 * admin paths are always allowed through.
 */
export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  if (!settings.maintenanceMode) return <>{children}</>;

  const path = headers().get("x-pathname") ?? "";
  if (ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return <>{children}</>;
  }
  if (path === "/sw.js" || path === "/robots.txt" || path === "/sitemap.xml") {
    return <>{children}</>;
  }

  const session = await getSession();
  if (await isSuperAdmin(session?.user?.id)) return <>{children}</>;

  redirect("/maintenance");
}
