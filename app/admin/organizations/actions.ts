"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { organization, member } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

const planSchema = z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]);

export async function changeOrgPlan(orgId: string, plan: string) {
  const admin = await requireSuperAdmin();
  const newPlan = planSchema.parse(plan);
  await db
    .update(organization)
    .set({ plan: newPlan, updatedAt: new Date() })
    .where(eq(organization.id, orgId));
  await recordAudit({
    organizationId: orgId,
    userId: admin.id,
    action: "admin.org.plan_change",
    entityType: "organization",
    entityId: orgId,
    data: { plan: newPlan },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/billing");
}

export async function suspendOrg(orgId: string, reason: string) {
  const admin = await requireSuperAdmin();
  await db
    .update(organization)
    .set({ suspendedAt: new Date(), suspendedReason: reason || null, updatedAt: new Date() })
    .where(eq(organization.id, orgId));
  await recordAudit({
    organizationId: orgId,
    userId: admin.id,
    action: "admin.org.suspend",
    entityType: "organization",
    entityId: orgId,
    data: { reason },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
}

export async function unsuspendOrg(orgId: string) {
  const admin = await requireSuperAdmin();
  await db
    .update(organization)
    .set({ suspendedAt: null, suspendedReason: null, updatedAt: new Date() })
    .where(eq(organization.id, orgId));
  await recordAudit({
    organizationId: orgId,
    userId: admin.id,
    action: "admin.org.unsuspend",
    entityType: "organization",
    entityId: orgId,
  });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
}

export async function deleteOrg(orgId: string) {
  const admin = await requireSuperAdmin();
  // Membership rows cascade with organization on delete.
  await db.delete(member).where(eq(member.organizationId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
  await recordAudit({
    userId: admin.id,
    action: "admin.org.delete",
    entityType: "organization",
    entityId: orgId,
  });
  redirect("/admin/organizations");
}
