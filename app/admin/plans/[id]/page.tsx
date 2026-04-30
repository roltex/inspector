import Link from "next/link";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db/client";
import { organization, type Plan } from "@/lib/db/schema";
import { getPlan } from "@/lib/billing/plans";
import { PLAN_ORDER } from "@/lib/billing/plan-types";
import { PageHeader } from "@/components/ui/page-header";
import { PlanForm } from "./plan-form";

export const dynamic = "force-dynamic";

export default async function AdminPlanEditPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id.toUpperCase() as Plan;
  if (!(PLAN_ORDER as string[]).includes(id)) notFound();

  const plan = await getPlan(id);
  const [tenantCount] = await db
    .select({ c: count() })
    .from(organization)
    .where(eq(organization.plan, id));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/plans"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to plans
      </Link>

      <PageHeader
        title={`Edit ${plan.name}`}
        description={
          plan.priceIdMonthly || plan.priceIdYearly
            ? `Stripe is the source of truth for the monthly/yearly charge on this plan (price IDs are configured in environment variables). The values below are used purely for display on the marketing site and inside the app.`
            : `Display-only plan. There are no Stripe price IDs bound to this plan; users will not see a "Subscribe" button, only the "${plan.cta ?? "Contact"}" call to action.`
        }
      />

      <p className="text-xs text-muted-foreground">
        Currently <span className="font-medium text-foreground">{Number(tenantCount?.c ?? 0)}</span> tenants are on this plan.
      </p>

      <PlanForm
        plan={{
          id: plan.id,
          name: plan.name,
          tagline: plan.tagline,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          userLimit: plan.userLimit,
          storageLimitGb: plan.storageLimitGB,
          features: plan.features,
          highlights: plan.highlights,
          cta: plan.cta ?? "",
          popular: plan.popular,
          isPublic: plan.isPublic,
          isArchived: plan.isArchived,
          displayOrder: plan.displayOrder,
          stripeMonthlyConfigured: Boolean(plan.priceIdMonthly),
          stripeYearlyConfigured: Boolean(plan.priceIdYearly),
        }}
      />
    </div>
  );
}
