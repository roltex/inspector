"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organization } from "@/lib/db/schema";
import { stripe, isBillingEnabled } from "@/lib/billing/stripe";
import { planFromPriceId } from "@/lib/billing/plans";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

export async function resyncOrgFromStripe(orgId: string) {
  const admin = await requireSuperAdmin();
  if (!isBillingEnabled()) throw new Error("Stripe is not configured.");
  const [org] = await db.select().from(organization).where(eq(organization.id, orgId)).limit(1);
  if (!org) throw new Error("Tenant not found.");
  if (!org.stripeSubscriptionId) throw new Error("Tenant has no Stripe subscription on file.");

  const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const priceId = sub.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId) ?? org.plan;
  await db
    .update(organization)
    .set({
      plan,
      subscriptionStatus: sub.status as typeof org.subscriptionStatus,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, orgId));

  await recordAudit({
    organizationId: orgId,
    userId: admin.id,
    action: "admin.billing.resync",
    entityType: "organization",
    entityId: orgId,
    data: { status: sub.status, plan },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/billing");
}
