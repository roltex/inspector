"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { chemical } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  name: z.string().min(2),
  casNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  hazardClass: z.string().optional(),
  signalWord: z.string().optional(),
  location: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
});

export async function createChemical(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  await db.insert(chemical).values({
    id: createId("chm"),
    organizationId: m.organization.id,
    name: data.name,
    casNumber: data.casNumber || null,
    manufacturer: data.manufacturer || null,
    hazardClass: data.hazardClass || null,
    signalWord: data.signalWord || null,
    location: data.location || null,
    quantity: data.quantity ?? null,
    unit: data.unit || null,
  });
  revalidatePath(`/${orgSlug}/chemicals`);
}
