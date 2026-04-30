"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ppeItem } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const schema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  unit: z.string().default("pcs"),
});

export async function createPpeItem(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = schema.parse(input);
  await db.insert(ppeItem).values({
    id: createId("ppe"),
    organizationId: m.organization.id,
    name: data.name,
    category: data.category || null,
    stockQuantity: data.stockQuantity,
    minStock: data.minStock,
    unit: data.unit,
  });
  revalidatePath(`/${orgSlug}/ppe`);
}
