import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user as userTable } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export type SuperAdmin = {
  id: string;
  email: string;
  name: string;
  superAdmin: true;
};

/* --------------------------------------------------------------------------
 * Step-up admin auth: short-lived signed cookie that `/admin/sign-in` issues
 * after re-verifying the user's password. Even users who are super-admin must
 * present this cookie before any /admin route renders.
 * ------------------------------------------------------------------------ */

export const ADMIN_AUTH_COOKIE = "inspector.admin_auth";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60; // 1 hour

function hmac(value: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("base64url");
}

/** Build a `<userId>.<expEpoch>.<sig>` token. */
export function signAdminToken(userId: string, ttlSeconds = ADMIN_SESSION_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyAdminToken(token: string | undefined): { userId: string; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const userId = parts[0]!;
  const expStr = parts[1]!;
  const sig = parts[2]!;
  const expected = hmac(`${userId}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  return { userId, exp };
}

export function setAdminCookie(userId: string) {
  const token = signAdminToken(userId);
  cookies().set(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.BETTER_AUTH_URL.startsWith("https://"),
    path: "/admin",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export function clearAdminCookie() {
  cookies().delete(ADMIN_AUTH_COOKIE);
}

/* --------------------------------------------------------------------------
 * Guards
 * ------------------------------------------------------------------------ */

/**
 * Server-side guard for the platform admin panel.
 *
 * Order of checks:
 *  1. There must be an active Better Auth session — otherwise → /sign-in.
 *  2. The user must be flagged super_admin in the database — otherwise → /.
 *  3. There must be a fresh `inspector.admin_auth` cookie that matches the
 *     current user — otherwise → /admin/sign-in (step-up).
 */
export async function requireSuperAdmin(redirectTo = "/admin"): Promise<SuperAdmin> {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?next=${encodeURIComponent(redirectTo)}`);
  }

  const [row] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      superAdmin: userTable.superAdmin,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!row || !row.superAdmin) {
    redirect("/");
  }

  const adminTok = verifyAdminToken(cookies().get(ADMIN_AUTH_COOKIE)?.value);
  if (!adminTok || adminTok.userId !== row.id) {
    redirect(`/admin/sign-in?next=${encodeURIComponent(redirectTo)}`);
  }

  return { ...row, superAdmin: true };
}

export async function isSuperAdmin(userId: string | undefined | null) {
  if (!userId) return false;
  const [row] = await db
    .select({ superAdmin: userTable.superAdmin })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return Boolean(row?.superAdmin);
}
