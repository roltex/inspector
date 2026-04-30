"use server";

import { eq } from "drizzle-orm";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { organization } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { stripe, isBillingEnabled } from "./stripe";
import { getPlan } from "./plans";
import type { Plan } from "@/lib/db/schema";

export async function createCheckoutSession(
  orgSlug: string,
  planId: Exclude<Plan, "FREE" | "ENTERPRISE">,
  interval: "monthly" | "yearly",
) {
  const m = await requireMembership(orgSlug);
  if (m.role !== "OWNER") throw new Error("Only the owner can manage billing");
  if (!isBillingEnabled()) throw new Error("Billing is not configured");

  const plan = await getPlan(planId);
  const priceId = interval === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly;
  if (!priceId) throw new Error(`Missing Stripe price for ${planId}/${interval}`);

  let customerId = m.organization.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: m.user.email,
      name: m.organization.name,
      metadata: { organizationId: m.organization.id, slug: m.organization.slug },
    });
    customerId = customer.id;
    await db
      .update(organization)
      .set({ stripeCustomerId: customerId })
      .where(eq(organization.id, m.organization.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/${orgSlug}/settings/billing?success=1`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/${orgSlug}/settings/billing?canceled=1`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { organizationId: m.organization.id },
    },
    metadata: { organizationId: m.organization.id, plan: planId },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("No checkout URL returned");
  return session.url;
}

export async function createPortalSession(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  if (m.role !== "OWNER") throw new Error("Only the owner can manage billing");
  if (!isBillingEnabled()) throw new Error("Billing is not configured");
  if (!m.organization.stripeCustomerId) throw new Error("No Stripe customer");

  const portal = await stripe.billingPortal.sessions.create({
    customer: m.organization.stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/${orgSlug}/settings/billing`,
  });
  return portal.url;
}
