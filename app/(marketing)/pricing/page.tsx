import Link from "next/link";
import { Check } from "lucide-react";
import { getPublicPlans } from "@/lib/billing/plans";
import { getT } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

function formatPrice(amount: number | null, currency: string, locale: string) {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

export default async function PricingPage() {
  const [plans, { t, locale }] = await Promise.all([getPublicPlans(), getT()]);

  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          {t("marketing.pricing.eyebrow")}
        </p>
        <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          {t("marketing.pricing.title")}
        </h1>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          {t("marketing.pricing.subtitle")}
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const formatted = formatPrice(p.priceMonthly, p.currency, locale);
          return (
            <Card key={p.id} className={p.popular ? "border-primary ring-1 ring-primary/20" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  {p.popular && <Badge>{t("marketing.pricing.mostPopular")}</Badge>}
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {formatted == null ? (
                    t("marketing.pricing.custom")
                  ) : (
                    <>
                      {formatted}
                      <span className="text-base text-muted-foreground">
                        {" "}
                        {t("marketing.pricing.perMonth")}
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" /> {h}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full" variant={p.popular ? "default" : "outline"}>
                  <Link href={p.id === "ENTERPRISE" ? "mailto:sales@inspector.app" : "/sign-up"}>
                    {p.cta ?? t("common.getStarted")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-3xl border bg-muted/30 p-8 text-center">
        <h2 className="text-xl font-semibold">{t("marketing.pricing.helpTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("marketing.pricing.helpDescription")}
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href="mailto:sales@inspector.app">{t("common.contactSales")}</Link>
        </Button>
      </div>
    </section>
  );
}
