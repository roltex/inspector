import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db/client";
import { organization } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { stripe, isBillingEnabled } from "@/lib/billing/stripe";
import { planFromPriceId } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isBillingEnabled() || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, reason: "billing_disabled" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `invalid signature: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        if (orgId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(orgId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (orgId) await syncSubscription(orgId, sub);
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook]", err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

async function syncSubscription(organizationId: string, sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId) ?? "FREE";
  await db
    .update(organization)
    .set({
      plan,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status as never,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, organizationId));
}
