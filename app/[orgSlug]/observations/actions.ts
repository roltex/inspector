"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { observation } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  type: z.enum(["SAFE", "UNSAFE_ACT", "UNSAFE_CONDITION", "NEAR_MISS", "POSITIVE"]),
  description: z.string().min(2).max(2000),
  location: z.string().max(200).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
});

export async function createObservation(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  const id = createId("obs");
  await db.insert(observation).values({
    id,
    organizationId: m.organization.id,
    type: data.type,
    description: data.description,
    location: data.location || null,
    severity: data.severity,
    reportedById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/observations`);
  redirect(`/${orgSlug}/observations`);
}

export async function deleteObservation(orgSlug: string, id: string) {
  const m = await requireMembership(orgSlug);
  await db
    .delete(observation)
    .where(and(eq(observation.id, id), eq(observation.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/observations`);
}
