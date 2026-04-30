"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession, createPortalSession } from "@/lib/billing/actions";
import type { Plan } from "@/lib/db/schema";

export function BillingActions({
  orgSlug,
  planId,
  hasCustomer,
}: {
  orgSlug: string;
  planId?: Plan;
  hasCustomer: boolean;
}) {
  const [pending, start] = useTransition();

  if (planId && (planId === "STARTER" || planId === "PRO")) {
    return (
      <div className="flex gap-2">
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => {
            start(async () => {
              try {
                const url = await createCheckoutSession(orgSlug, planId, "monthly");
                window.location.href = url;
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            });
          }}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Upgrade
        </Button>
      </div>
    );
  }

  if (hasCustomer) {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          start(async () => {
            try {
              const url = await createPortalSession(orgSlug);
              window.location.href = url;
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : "Failed");
            }
          });
        }}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Manage subscription
      </Button>
    );
  }

  return null;
}
