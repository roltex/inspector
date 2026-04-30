import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { planDefinition, type Plan } from "@/lib/db/schema";
import {
  FALLBACK_PLANS,
  FEATURE_KEYS,
  type FeatureKey,
  type PlanConfig,
} from "./plan-types";

export {
  FEATURE_KEYS,
  FEATURE_LABELS,
  PLAN_ORDER,
  hasFeatureSync,
  type FeatureKey,
  type PlanConfig,
} from "./plan-types";

const stripeIds = () => ({
  starterM: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starterY: process.env.STRIPE_PRICE_STARTER_YEARLY,
  proM: process.env.STRIPE_PRICE_PRO_MONTHLY,
  proY: process.env.STRIPE_PRICE_PRO_YEARLY,
});

const CACHE_TTL_MS = 60_000;
let cache: { at: number; plans: Record<Plan, PlanConfig> } | null = null;

function attachStripeIds(p: PlanConfig): PlanConfig {
  const ids = stripeIds();
  if (p.id === "STARTER") {
    return { ...p, priceIdMonthly: ids.starterM, priceIdYearly: ids.starterY };
  }
  if (p.id === "PRO") {
    return { ...p, priceIdMonthly: ids.proM, priceIdYearly: ids.proY };
  }
  return p;
}

function rowToConfig(row: typeof planDefinition.$inferSelect): PlanConfig {
  const features = ((row.features ?? []) as string[]).filter((k): k is FeatureKey =>
    (FEATURE_KEYS as string[]).includes(k),
  );
  return attachStripeIds({
    id: row.id as Plan,
    name: row.name,
    tagline: row.tagline ?? "",
    priceMonthly: row.priceMonthly,
    priceYearly: row.priceYearly,
    currency: row.currency,
    userLimit: row.userLimit,
    storageLimitGB: row.storageLimitGb,
    features,
    highlights: (row.highlights ?? []) as string[],
    popular: row.popular,
    isPublic: row.isPublic,
    isArchived: row.isArchived,
    displayOrder: row.displayOrder,
    cta: row.cta,
  });
}

async function loadFromDb(): Promise<Record<Plan, PlanConfig>> {
  try {
    const rows = await db
      .select()
      .from(planDefinition)
      .orderBy(asc(planDefinition.displayOrder));
    if (rows.length === 0) return Object.fromEntries(
      Object.entries(FALLBACK_PLANS).map(([k, v]) => [k, attachStripeIds(v)]),
    ) as Record<Plan, PlanConfig>;
    const merged: Record<string, PlanConfig> = { ...FALLBACK_PLANS };
    for (const r of rows) merged[r.id] = rowToConfig(r);
    return merged as Record<Plan, PlanConfig>;
  } catch {
    return Object.fromEntries(
      Object.entries(FALLBACK_PLANS).map(([k, v]) => [k, attachStripeIds(v)]),
    ) as Record<Plan, PlanConfig>;
  }
}

export async function getPlans(): Promise<Record<Plan, PlanConfig>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.plans;
  const plans = await loadFromDb();
  cache = { at: Date.now(), plans };
  return plans;
}

export async function getPlan(id: Plan): Promise<PlanConfig> {
  const plans = await getPlans();
  return plans[id];
}

/** Public plans only, ordered, excluding archived. Used by /pricing. */
export async function getPublicPlans(): Promise<PlanConfig[]> {
  const plans = await getPlans();
  return Object.values(plans)
    .filter((p) => p.isPublic && !p.isArchived)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function invalidatePlanCache() {
  cache = null;
}

export async function hasFeature(plan: Plan | null | undefined, feature: FeatureKey): Promise<boolean> {
  if (!plan) return false;
  const cfg = await getPlan(plan);
  return cfg.features.includes(feature);
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  const ids = stripeIds();
  if (priceId === ids.starterM || priceId === ids.starterY) return "STARTER";
  if (priceId === ids.proM || priceId === ids.proY) return "PRO";
  return null;
}
