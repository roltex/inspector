import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: { name: "Inspector", version: "0.1.0" },
    })
  : (null as unknown as Stripe);

export function isBillingEnabled() {
  return Boolean(env.STRIPE_SECRET_KEY);
}
