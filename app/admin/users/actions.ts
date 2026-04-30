"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user, session } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

export async function banUser(userId: string, reason: string) {
  const admin = await requireSuperAdmin();
  if (admin.id === userId) throw new Error("You cannot ban yourself.");
  await db
    .update(user)
    .set({ bannedAt: new Date(), banReason: reason || null, updatedAt: new Date() })
    .where(eq(user.id, userId));
  // Revoke active sessions so the ban takes effect immediately.
  await db.delete(session).where(eq(session.userId, userId));
  await recordAudit({
    userId: admin.id,
    action: "admin.user.ban",
    entityType: "user",
    entityId: userId,
    data: { reason },
  });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function unbanUser(userId: string) {
  const admin = await requireSuperAdmin();
  await db
    .update(user)
    .set({ bannedAt: null, banReason: null, updatedAt: new Date() })
    .where(eq(user.id, userId));
  await recordAudit({
    userId: admin.id,
    action: "admin.user.unban",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function setSuperAdmin(userId: string, value: boolean) {
  const admin = await requireSuperAdmin();
  if (!value && admin.id === userId) {
    throw new Error("You cannot demote yourself. Promote another super-admin first.");
  }
  await db
    .update(user)
    .set({ superAdmin: value, updatedAt: new Date() })
    .where(eq(user.id, userId));
  await recordAudit({
    userId: admin.id,
    action: value ? "admin.user.promote" : "admin.user.demote",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function forceLogout(userId: string) {
  const admin = await requireSuperAdmin();
  await db.delete(session).where(eq(session.userId, userId));
  await recordAudit({
    userId: admin.id,
    action: "admin.user.force_logout",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath(`/admin/users/${userId}`);
}

export async function revokeSession(sessionId: string, userId: string) {
  const admin = await requireSuperAdmin();
  await db.delete(session).where(eq(session.id, sessionId));
  await recordAudit({
    userId: admin.id,
    action: "admin.user.session_revoke",
    entityType: "session",
    entityId: sessionId,
    data: { targetUserId: userId },
  });
  revalidatePath(`/admin/users/${userId}`);
}
