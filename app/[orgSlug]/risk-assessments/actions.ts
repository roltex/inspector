"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { riskAssessment } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const hazardSchema = z.object({
  id: z.string(),
  hazard: z.string().min(1),
  whoAtRisk: z.string().optional(),
  likelihood: z.number().min(1).max(5),
  severity: z.number().min(1).max(5),
  initialRisk: z.number(),
  controls: z.array(z.string()).default([]),
  residualLikelihood: z.number().min(1).max(5),
  residualSeverity: z.number().min(1).max(5),
  residualRisk: z.number(),
});

const schema = z.object({
  title: z.string().min(2).max(200),
  activity: z.string().max(400).optional(),
});

export async function createRiskAssessment(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  const id = createId("risk");
  await db.insert(riskAssessment).values({
    id,
    organizationId: m.organization.id,
    title: data.title,
    activity: data.activity || null,
    assessorId: m.user.id,
    hazards: [],
  });
  revalidatePath(`/${orgSlug}/risk-assessments`);
  redirect(`/${orgSlug}/risk-assessments/${id}`);
}

export async function saveHazards(orgSlug: string, id: string, hazards: unknown) {
  const m = await requireMembership(orgSlug);
  const parsed = z.array(hazardSchema).parse(hazards);
  await db
    .update(riskAssessment)
    .set({ hazards: parsed, updatedAt: new Date() })
    .where(and(eq(riskAssessment.id, id), eq(riskAssessment.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/risk-assessments/${id}`);
}
