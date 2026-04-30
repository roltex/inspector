"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { account, member, user } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import {
  memberCreateSchema,
  memberUpdateSchema,
} from "@/lib/validators/members";

/** Throws if the caller cannot manage members for this workspace. */
async function requireMemberManager(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  if (m.role !== "OWNER" && m.role !== "ADMIN") {
    throw new Error("You don't have permission to manage members");
  }
  return m;
}

/**
 * Create a new workspace member directly. The owner sets initial credentials
 * (no email-invite round-trip). If the email already belongs to a registered
 * user, that user is added to the workspace with the chosen role; otherwise a
 * fresh user account is created with the supplied password.
 */
export async function createMember(orgSlug: string, input: unknown) {
  const m = await requireMemberManager(orgSlug);
  const data = memberCreateSchema.parse(input);

  // Only OWNER may grant the OWNER role.
  if (data.role === "OWNER" && m.role !== "OWNER") {
    throw new Error("Only an owner can grant the Owner role");
  }

  // Find or create the user account.
  let [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, data.email))
    .limit(1);

  let userId: string;
  if (existing) {
    userId = existing.id;
    // Already a member of this org? bail.
    const [already] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, m.organization.id),
          eq(member.userId, userId),
        ),
      )
      .limit(1);
    if (already) throw new Error("This user is already a member of the workspace");
  } else {
    userId = createId("usr");
    const passwordHash = await hashPassword(data.password);
    await db.insert(user).values({
      id: userId,
      name: data.name,
      email: data.email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(account).values({
      id: createId("acc"),
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.insert(member).values({
    id: createId("mem"),
    organizationId: m.organization.id,
    userId,
    role: data.role as never,
    createdAt: new Date(),
  });

  revalidatePath(`/${orgSlug}/settings/members`);
}

/** Change a workspace member's role. */
export async function updateMemberRole(
  orgSlug: string,
  memberId: string,
  input: unknown,
) {
  const m = await requireMemberManager(orgSlug);
  const data = memberUpdateSchema.parse(input);

  // Load the target member, scoped to this org.
  const [target] = await db
    .select()
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.organizationId, m.organization.id)))
    .limit(1);
  if (!target) throw new Error("Member not found");

  // Only OWNER may grant or remove the OWNER role.
  if ((data.role === "OWNER" || target.role === "OWNER") && m.role !== "OWNER") {
    throw new Error("Only an owner can change Owner-level access");
  }

  // Block demoting the last remaining owner.
  if (target.role === "OWNER" && data.role !== "OWNER") {
    const owners = await db
      .select({ value: count() })
      .from(member)
      .where(
        and(
          eq(member.organizationId, m.organization.id),
          eq(member.role, "OWNER"),
        ),
      );
    if (Number(owners[0]?.value ?? 0) <= 1) {
      throw new Error("Cannot demote the last remaining owner");
    }
  }

  await db
    .update(member)
    .set({ role: data.role as never })
    .where(eq(member.id, memberId));

  revalidatePath(`/${orgSlug}/settings/members`);
}

/** Remove a member from this workspace (does not delete the user account). */
export async function removeMember(orgSlug: string, memberId: string) {
  const m = await requireMemberManager(orgSlug);

  const [target] = await db
    .select()
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.organizationId, m.organization.id)))
    .limit(1);
  if (!target) throw new Error("Member not found");

  // Cannot remove yourself this way (use "leave workspace" elsewhere).
  if (target.userId === m.user.id) {
    throw new Error("You cannot remove yourself; ask another owner.");
  }

  // Only OWNER can remove another OWNER.
  if (target.role === "OWNER" && m.role !== "OWNER") {
    throw new Error("Only an owner can remove another owner");
  }

  // Block removing the last remaining owner.
  if (target.role === "OWNER") {
    const owners = await db
      .select({ value: count() })
      .from(member)
      .where(
        and(
          eq(member.organizationId, m.organization.id),
          eq(member.role, "OWNER"),
        ),
      );
    if (Number(owners[0]?.value ?? 0) <= 1) {
      throw new Error("Cannot remove the last remaining owner");
    }
  }

  await db.delete(member).where(eq(member.id, memberId));
  revalidatePath(`/${orgSlug}/settings/members`);
}
