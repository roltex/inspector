"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getCookies } from "better-auth/cookies";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { session as sessionTable, user as userTable, organization, member } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";

const COOKIES = getCookies((auth as unknown as { options: Parameters<typeof getCookies>[0] }).options);
const SESSION_COOKIE_NAME = COOKIES.sessionToken.name;
const SESSION_COOKIE_OPTIONS = COOKIES.sessionToken.options;
const ADMIN_ORIGIN_COOKIE = "inspector.admin_origin";

/** Sign a value with HMAC-SHA256 in the same format Better Auth expects: "<value>.<base64-sig>" */
function signedCookieValue(value: string) {
  const sig = createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("base64");
  return `${value}.${sig}`;
}

function tokenFromCookieValue(raw: string | undefined) {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  return idx > 0 ? raw.slice(0, idx) : raw;
}

export async function impersonateUser(targetUserId: string) {
  const admin = await requireSuperAdmin();
  if (admin.id === targetUserId) {
    throw new Error("You cannot impersonate yourself.");
  }

  const [target] = await db.select().from(userTable).where(eq(userTable.id, targetUserId)).limit(1);
  if (!target) throw new Error("User not found.");
  if (target.bannedAt) throw new Error("Cannot impersonate a banned user.");

  // Resolve the admin's current session token so we can restore it later.
  const jar = cookies();
  const adminCookieRaw = jar.get(SESSION_COOKIE_NAME)?.value;
  const adminToken = tokenFromCookieValue(adminCookieRaw ?? undefined);
  if (!adminToken) throw new Error("No admin session found. Sign in again.");

  // Find the first organization the target belongs to so we can land somewhere sensible.
  const [firstMembership] = await db
    .select({ slug: organization.slug, orgId: organization.id })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, target.id))
    .limit(1);

  // Mint a fresh impersonation session row.
  const token = randomBytes(24).toString("base64url");
  const sessionId = randomBytes(16).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  await db.insert(sessionTable).values({
    id: sessionId,
    userId: target.id,
    token,
    expiresAt,
    impersonatedBy: admin.id,
    activeOrganizationId: firstMembership?.orgId ?? null,
    ipAddress: headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headers().get("user-agent") ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Stash the admin's original session token in a separate signed cookie so we can
  // restore it on /admin/impersonation/stop.
  jar.set(ADMIN_ORIGIN_COOKIE, signedCookieValue(adminToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_OPTIONS.secure,
    path: "/",
    maxAge: 60 * 60,
  });

  // Overwrite the main session cookie with the new (impersonation) token.
  jar.set(SESSION_COOKIE_NAME, signedCookieValue(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_OPTIONS.secure,
    path: "/",
    maxAge: 60 * 60,
  });

  await recordAudit({
    userId: admin.id,
    action: "impersonate.start",
    entityType: "user",
    entityId: target.id,
    data: { adminEmail: admin.email, targetEmail: target.email },
  });

  redirect(firstMembership ? `/${firstMembership.slug}/dashboard` : "/onboarding");
}

export async function stopImpersonation() {
  const jar = cookies();
  const adminOriginRaw = jar.get(ADMIN_ORIGIN_COOKIE)?.value;
  const adminToken = tokenFromCookieValue(adminOriginRaw ?? undefined);
  const currentRaw = jar.get(SESSION_COOKIE_NAME)?.value;
  const currentToken = tokenFromCookieValue(currentRaw ?? undefined);

  if (!adminToken) {
    // Nothing to restore — just clear the cookie.
    jar.delete(SESSION_COOKIE_NAME);
    redirect("/sign-in");
  }

  // Look up the admin behind the impersonation row for the audit trail.
  let impersonatedBy: string | null = null;
  let targetUserId: string | null = null;
  if (currentToken) {
    const [row] = await db
      .select({ id: sessionTable.id, userId: sessionTable.userId, impersonatedBy: sessionTable.impersonatedBy })
      .from(sessionTable)
      .where(eq(sessionTable.token, currentToken))
      .limit(1);
    if (row?.impersonatedBy) {
      impersonatedBy = row.impersonatedBy;
      targetUserId = row.userId;
      // Drop the impersonation row.
      await db.delete(sessionTable).where(eq(sessionTable.id, row.id));
    }
  }

  // Restore the admin's session cookie and clear the origin marker.
  jar.set(SESSION_COOKIE_NAME, signedCookieValue(adminToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_OPTIONS.secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  jar.delete(ADMIN_ORIGIN_COOKIE);

  if (impersonatedBy) {
    await recordAudit({
      userId: impersonatedBy,
      action: "impersonate.end",
      entityType: "user",
      entityId: targetUserId,
    });
  }

  redirect("/admin");
}
