"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireMembership, requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { permit } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum([
    "HOT_WORK", "CONFINED_SPACE", "WORKING_AT_HEIGHT", "ELECTRICAL",
    "EXCAVATION", "LOCKOUT_TAGOUT", "GENERAL",
  ]),
  location: z.string().max(200).optional(),
  workDescription: z.string().max(2000).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export async function createPermit(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "permits:request");
  const data = schema.parse(input);
  const id = createId("per");
  await db.insert(permit).values({
    id,
    organizationId: m.organization.id,
    type: data.type,
    title: data.title,
    status: "REQUESTED",
    location: data.location || null,
    workDescription: data.workDescription || null,
    applicantId: m.user.id,
    validFrom: data.validFrom ? new Date(data.validFrom) : null,
    validTo: data.validTo ? new Date(data.validTo) : null,
    checklist: [],
  });
  revalidatePath(`/${orgSlug}/permits`);
  redirect(`/${orgSlug}/permits/${id}`);
}

export async function approvePermit(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "permits:approve");
  await db
    .update(permit)
    .set({ status: "APPROVED", approverId: m.user.id, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(permit.id, id), eq(permit.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/permits/${id}`);
  revalidatePath(`/${orgSlug}/permits`);
}

export async function rejectPermit(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "permits:approve");
  await db
    .update(permit)
    .set({ status: "REJECTED", updatedAt: new Date() })
    .where(and(eq(permit.id, id), eq(permit.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/permits/${id}`);
}
