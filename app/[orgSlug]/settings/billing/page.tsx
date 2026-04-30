import { Check } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { isBillingEnabled } from "@/lib/billing/stripe";
import { getPlans, getPublicPlans } from "@/lib/billing/plans";
import { getT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingActions } from "./billing-actions";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function Billing({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const billing = isBillingEnabled();
  const plans = await getPlans();
  const visiblePlans = await getPublicPlans();
  const currentPlan = plans[m.organization.plan];
  const { t, locale } = await getT();
  const fmtDate = (d: Date) => d.toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("billing.currentPlan")} <Badge>{currentPlan.name}</Badge>
          </CardTitle>
          <CardDescription>
            {m.organization.subscriptionStatus
              ? m.organization.currentPeriodEnd
                ? t("billing.statusRenews", {
                    status: m.organization.subscriptionStatus,
                    date: fmtDate(m.organization.currentPeriodEnd),
                  })
                : t("billing.statusActive", { status: m.organization.subscriptionStatus })
              : t("billing.onFreeTier")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!billing ? (
            <p className="text-sm text-muted-foreground">{t("billing.stripeNotConfigured")}</p>
          ) : (
            <BillingActions orgSlug={params.orgSlug} hasCustomer={!!m.organization.stripeCustomerId} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visiblePlans.map((p) => {
          const isCurrent = p.id === currentPlan.id;
          return (
            <Card key={p.id} className={isCurrent ? "border-primary ring-1 ring-primary/20" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.name}
                  {p.popular && <Badge variant="default">{t("marketing.pricing.mostPopular")}</Badge>}
                </CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {p.priceMonthly == null ? (
                    <p className="text-2xl font-semibold">{t("marketing.pricing.custom")}</p>
                  ) : (
                    <p>
                      <span className="text-3xl font-semibold">${p.priceMonthly}</span>
                      <span className="text-sm text-muted-foreground"> {t("billing.perMonth")}</span>
                    </p>
                  )}
                </div>
                <ul className="space-y-1.5 text-sm">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                {billing && !isCurrent && p.id !== "FREE" && p.id !== "ENTERPRISE" && (
                  <BillingActions
                    orgSlug={params.orgSlug}
                    planId={p.id}
                    hasCustomer={!!m.organization.stripeCustomerId}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
