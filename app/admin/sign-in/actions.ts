"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/lib/db/client";
import { user, account } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { setAdminCookie } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

export type AdminSignInState = { ok: false; error?: string } | { ok: true };

const FAIL_DELAY_MS = 600;

async function delayedFail(error: string): Promise<AdminSignInState> {
  await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
  return { ok: false, error };
}

function clientIp() {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * Step-up admin authentication.
 *
 * The visitor must already be signed in to the regular app (the middleware
 * enforces this for /admin, redirecting to /sign-in?next=/admin/sign-in if
 * needed). This action then:
 *
 *  1. Re-verifies the current user's password (defense in depth — even if a
 *     session cookie is stolen, the attacker can't enter the admin panel).
 *  2. Confirms the user is a super-admin.
 *  3. Issues a 1-hour `inspector.admin_auth` cookie scoped to /admin.
 */
export async function adminSignInAction(
  _prev: AdminSignInState,
  formData: FormData,
): Promise<AdminSignInState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!password) return { ok: false, error: "Password is required." };

  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/admin/sign-in?next=${next}`)}`);
  }

  const [u] = await db
    .select({
      id: user.id,
      email: user.email,
      superAdmin: user.superAdmin,
      bannedAt: user.bannedAt,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!u) return delayedFail("Account not found.");
  if (u.bannedAt) return delayedFail("This account has been suspended.");

  const [cred] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, u.id), eq(account.providerId, "credential")))
    .limit(1);

  if (!cred?.password) {
    return delayedFail("This account doesn't have a password configured. Contact support.");
  }

  const ok = await verifyPassword({ hash: cred.password, password }).catch(() => false);
  if (!ok) {
    await recordAudit({
      userId: u.id,
      action: "admin.signin.failed",
      data: { reason: "bad_password" },
      ipAddress: clientIp(),
    });
    return delayedFail("Incorrect password.");
  }

  if (!u.superAdmin) {
    await recordAudit({
      userId: u.id,
      action: "admin.signin.failed",
      data: { reason: "not_super_admin" },
      ipAddress: clientIp(),
    });
    return delayedFail("This account is not authorized for the admin panel.");
  }

  setAdminCookie(u.id);
  await recordAudit({
    userId: u.id,
    action: "admin.signin.success",
    ipAddress: clientIp(),
  });

  redirect(next.startsWith("/admin") && !next.startsWith("/admin/sign-") ? next : "/admin");
}
