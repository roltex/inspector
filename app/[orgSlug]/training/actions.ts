"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { trainingProgram } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  durationHours: z.coerce.number().optional(),
  validityMonths: z.coerce.number().int().optional(),
  mandatory: z.boolean().default(false),
});

export async function createProgram(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  await db.insert(trainingProgram).values({
    id: createId("trn"),
    organizationId: m.organization.id,
    name: data.name,
    description: data.description || null,
    durationHours: data.durationHours ?? null,
    validityMonths: data.validityMonths ?? null,
    mandatory: data.mandatory,
  });
  revalidatePath(`/${orgSlug}/training`);
}
