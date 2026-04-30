import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { ArrowRight, Check, EyeOff, Lock, Star } from "lucide-react";
import { db } from "@/lib/db/client";
import { organization, type Plan } from "@/lib/db/schema";
import { getPlans } from "@/lib/billing/plans";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans" };

export default async function AdminPlansPage() {
  const plans = await getPlans();
  const planList = Object.values(plans).sort((a, b) => a.displayOrder - b.displayOrder);
  const { t } = await getT();

  // Count tenants on each plan in a single query.
  const counts = await db
    .select({ plan: organization.plan, c: count() })
    .from(organization)
    .groupBy(organization.plan);
  const tenantsByPlan = new Map<Plan, number>(counts.map((r) => [r.plan, Number(r.c)]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.plans.title")}
        description={t("admin.plans.description")}
      />

      <Card>
        <CardContent className="p-0">
          <div className="hidden border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1.4fr_0.7fr_0.6fr_1fr_auto]">
            <div>{t("admin.plans.tableHeaders.plan")}</div>
            <div>{t("admin.plans.tableHeaders.displayPrice")}</div>
            <div>{t("admin.plans.tableHeaders.tenants")}</div>
            <div>{t("admin.plans.tableHeaders.visibility")}</div>
            <div className="text-right">{t("admin.plans.tableHeaders.edit")}</div>
          </div>
          <ul className="divide-y">
            {planList.map((p) => {
              const tenants = tenantsByPlan.get(p.id) ?? 0;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-1 gap-2 p-4 md:grid-cols-[1.4fr_0.7fr_0.6fr_1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{p.id}</Badge>
                      {p.popular && (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
                          <Star className="h-3 w-3" /> {t("marketing.pricing.mostPopular")}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {p.tagline || "—"}
                    </div>
                  </div>

                  <div className="text-sm">
                    {p.priceMonthly == null ? (
                      <span className="text-muted-foreground">{t("marketing.pricing.custom")}</span>
                    ) : (
                      <span>
                        <span className="font-medium">${p.priceMonthly}</span>
                        <span className="text-muted-foreground"> {t("billing.perMonth")}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">{tenants}</div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {p.isArchived ? (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" /> {t("admin.plans.visibility.archived")}
                      </Badge>
                    ) : p.isPublic ? (
                      <Badge variant="outline" className="gap-1 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> {t("admin.plans.visibility.public")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <EyeOff className="h-3 w-3" /> {t("admin.plans.visibility.hidden")}
                      </Badge>
                    )}
                    <Badge variant="outline">{t("admin.plans.featuresCount", { count: p.features.length })}</Badge>
                  </div>

                  <div className="md:text-right">
                    <Link
                      href={`/admin/plans/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      {t("common.edit")} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("admin.plans.saveTip")}</p>
    </div>
  );
}
