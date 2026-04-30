"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { contractor } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  name: z.string().min(2),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  insuranceExpiresAt: z.string().optional(),
});

export async function createContractor(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  await db.insert(contractor).values({
    id: createId("ctr"),
    organizationId: m.organization.id,
    name: data.name,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    insuranceExpiresAt: data.insuranceExpiresAt ? new Date(data.insuranceExpiresAt) : null,
  });
  revalidatePath(`/${orgSlug}/contractors`);
}
