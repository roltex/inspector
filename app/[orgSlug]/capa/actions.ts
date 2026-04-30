"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { action } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueDate: z.string().optional(),
  sourceType: z
    .enum(["INSPECTION", "INCIDENT", "OBSERVATION", "RISK_ASSESSMENT", "AUDIT", "MANUAL"])
    .default("MANUAL"),
  sourceId: z.string().optional(),
});

export async function createAction(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  const id = createId("act");
  await db.insert(action).values({
    id,
    organizationId: m.organization.id,
    title: data.title,
    description: data.description || null,
    priority: data.priority,
    sourceType: data.sourceType,
    sourceId: data.sourceId || null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/capa`);
  redirect(`/${orgSlug}/capa/${id}`);
}

export async function updateActionStatus(orgSlug: string, id: string, status: string) {
  const m = await requireMembership(orgSlug);
  await db
    .update(action)
    .set({
      status: status as never,
      completedAt: status === "CLOSED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(action.id, id), eq(action.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/capa`);
  revalidatePath(`/${orgSlug}/capa/${id}`);
}
