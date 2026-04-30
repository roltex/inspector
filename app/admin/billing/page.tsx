import Link from "next/link";
import { count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organization, type Plan } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getPlans } from "@/lib/billing/plans";
import { isBillingEnabled } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const plans = await getPlans();
  const priceFor = (plan: Plan) => plans[plan]?.priceMonthly ?? 0;
  const dist = await db
    .select({ plan: organization.plan, c: count() })
    .from(organization)
    .groupBy(organization.plan);

  const [activeCount] = await db
    .select({ c: count() })
    .from(organization)
    .where(eq(organization.subscriptionStatus, "active"));

  const [pastDue] = await db
    .select({ c: count() })
    .from(organization)
    .where(eq(organization.subscriptionStatus, "past_due"));

  const subs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      status: organization.subscriptionStatus,
      currentPeriodEnd: organization.currentPeriodEnd,
      stripeCustomerId: organization.stripeCustomerId,
      stripeSubscriptionId: organization.stripeSubscriptionId,
    })
    .from(organization)
    .where(isNotNull(organization.stripeSubscriptionId))
    .orderBy(desc(organization.currentPeriodEnd))
    .limit(100);

  // Estimated MRR from current plan distribution (monthly equivalent).
  const mrr = dist.reduce((sum, row) => {
    return sum + priceFor(row.plan as Plan) * Number(row.c);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description={
          isBillingEnabled()
            ? "Subscription overview synced from Stripe."
            : "Stripe is not configured. The figures below are estimates from the local database only."
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Tenants" value={dist.reduce((s, r) => s + Number(r.c), 0)} />
        <StatCard label="Active subs" value={Number(activeCount?.c ?? 0)} />
        <StatCard label="Past due" value={Number(pastDue?.c ?? 0)} />
        <StatCard
          label="Estimated MRR"
          value={`$${mrr.toLocaleString()}`}
          hint="From current plan tiers"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {dist.length === 0 && <li className="text-sm text-muted-foreground">No tenants yet.</li>}
            {dist.map((p) => {
              const cfg = plans[p.plan as Plan];
              return (
                <li
                  key={p.plan}
                  className="flex items-center justify-between rounded-xl border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{cfg?.name ?? p.plan}</div>
                    <div className="text-xs text-muted-foreground">
                      {cfg?.priceMonthly != null ? `$${cfg.priceMonthly}/mo` : "Custom"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{Number(p.c)} tenants</span>
                    <span className="font-medium">
                      ${(priceFor(p.plan as Plan) * Number(p.c)).toLocaleString()}/mo
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paying tenants ({subs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {subs.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">
                No tenants with Stripe subscriptions.
              </li>
            )}
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/organizations/${s.id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {s.name}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">/{s.slug}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">{s.plan}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{s.status ?? "—"}</span>
                  {s.currentPeriodEnd && (
                    <span className="text-muted-foreground">
                      ends {new Date(s.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                  {s.stripeCustomerId && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Stripe ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
