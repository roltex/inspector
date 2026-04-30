"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { incident } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(["INJURY", "ILLNESS", "NEAR_MISS", "PROPERTY_DAMAGE", "ENVIRONMENTAL", "SECURITY", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  description: z.string().max(4000).optional(),
  injuredPersonName: z.string().max(200).optional(),
  bodyPart: z.string().max(100).optional(),
  lostTimeDays: z.coerce.number().int().min(0).default(0),
  occurredAt: z.string().optional(),
});

export async function createIncident(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = createSchema.parse(input);
  const id = createId("inc");
  await db.insert(incident).values({
    id,
    organizationId: m.organization.id,
    title: data.title,
    type: data.type,
    severity: data.severity,
    description: data.description || null,
    injuredPersonName: data.injuredPersonName || null,
    bodyPart: data.bodyPart || null,
    lostTimeDays: data.lostTimeDays,
    occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    reportedById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/incidents`);
  redirect(`/${orgSlug}/incidents/${id}`);
}

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "UNDER_REVIEW", "CLOSED", "OVERDUE", "CANCELLED"]).optional(),
  rootCause: z.any().optional(),
  description: z.string().optional(),
});

export async function updateIncident(orgSlug: string, id: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = updateSchema.parse(input);
  await db
    .update(incident)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(incident.id, id), eq(incident.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/incidents/${id}`);
}

export async function saveWhys(orgSlug: string, id: string, whys: string[]) {
  const m = await requireMembership(orgSlug);
  await db
    .update(incident)
    .set({ rootCause: { whys }, updatedAt: new Date() })
    .where(and(eq(incident.id, id), eq(incident.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/incidents/${id}`);
}
