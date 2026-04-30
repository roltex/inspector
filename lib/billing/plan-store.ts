import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { planDefinition, type Plan } from "@/lib/db/schema";
import { invalidatePlanCache, FEATURE_KEYS } from "./plans";

export const planUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  tagline: z.string().max(180).default(""),
  priceMonthly: z
    .union([z.number().int().min(0).max(99_999), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  priceYearly: z
    .union([z.number().int().min(0).max(999_999), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  currency: z.string().length(3).default("USD"),
  userLimit: z.number().int().min(1).max(1_000_000),
  storageLimitGb: z.number().int().min(0).max(1_000_000),
  features: z.array(z.enum(FEATURE_KEYS as [string, ...string[]])).default([]),
  highlights: z.array(z.string().min(1).max(200)).max(20).default([]),
  cta: z.string().max(60).nullable().optional().transform((v) => v ?? null),
  popular: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(1000).default(0),
});

export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

export async function updatePlanDefinition(
  id: Plan,
  input: PlanUpdateInput,
  updatedBy: string,
) {
  await db
    .update(planDefinition)
    .set({
      name: input.name,
      tagline: input.tagline,
      priceMonthly: input.priceMonthly,
      priceYearly: input.priceYearly,
      currency: input.currency,
      userLimit: input.userLimit,
      storageLimitGb: input.storageLimitGb,
      features: input.features,
      highlights: input.highlights,
      cta: input.cta,
      popular: input.popular,
      isPublic: input.isPublic,
      isArchived: input.isArchived,
      displayOrder: input.displayOrder,
      updatedAt: new Date(),
      updatedBy,
    })
    .where(eq(planDefinition.id, id));
  invalidatePlanCache();
}

export async function setPlanPopular(id: Plan, popular: boolean, updatedBy: string) {
  // Only one plan can be popular at a time. If we're turning popular ON,
  // first turn it off everywhere else.
  if (popular) {
    await db
      .update(planDefinition)
      .set({ popular: false, updatedAt: new Date(), updatedBy });
  }
  await db
    .update(planDefinition)
    .set({ popular, updatedAt: new Date(), updatedBy })
    .where(eq(planDefinition.id, id));
  invalidatePlanCache();
}
