"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { regulation, requirement } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const regSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(2),
  jurisdiction: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export async function createRegulation(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = regSchema.parse(input);
  await db.insert(regulation).values({
    id: createId("reg"),
    organizationId: m.organization.id,
    code: data.code || null,
    title: data.title,
    jurisdiction: data.jurisdiction || null,
    category: data.category || null,
    description: data.description || null,
  });
  revalidatePath(`/${orgSlug}/compliance`);
}

const reqSchema = z.object({
  title: z.string().min(2),
  regulationId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createRequirement(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = reqSchema.parse(input);
  await db.insert(requirement).values({
    id: createId("req"),
    organizationId: m.organization.id,
    regulationId: data.regulationId || null,
    title: data.title,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    ownerId: m.user.id,
  });
  revalidatePath(`/${orgSlug}/compliance`);
}
