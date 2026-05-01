import { Building2, ShieldAlert } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import { listRiskSectors } from "./actions";
import { listActiveRiskLevelOptions } from "../risk-levels/actions";
import { SectorDialog } from "./sector-dialog";
import { SectorRowActions } from "./row-actions";
import { RiskLevelBadge } from "./sector-badge";

export const metadata = { title: "Inspect items" };
export const dynamic = "force-dynamic";

export default async function RiskSectorsPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "riskSectors:manage");

  const [sectors, levelOptions] = await Promise.all([
    listRiskSectors(params.orgSlug),
    listActiveRiskLevelOptions(params.orgSlug),
  ]);

  const totals = {
    total: sectors.length,
    active: sectors.filter((s) => s.isActive).length,
    objects: sectors.reduce((sum, s) => sum + s.objectCount, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("modules.riskSectors.title")}
        description={t("modules.riskSectors.description")}
        actions={
          canManage ? (
            <SectorDialog orgSlug={params.orgSlug} levels={levelOptions} />
          ) : null
        }
      />

      {/* Summary chips — lightweight, just three totals */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label={t("modules.riskSectors.totalLabel")}
          value={totals.total}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("modules.riskSectors.activeLabel")}
          value={totals.active}
          tone="success"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("modules.riskSectors.taggedObjectsLabel")}
          value={totals.objects}
          tone="primary"
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {sectors.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          title={t("modules.riskSectors.emptyTitle")}
          description={t("modules.riskSectors.emptyDescription")}
          action={
            canManage ? (
              <SectorDialog orgSlug={params.orgSlug} levels={levelOptions} />
            ) : null
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {sectors.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-3 px-5 py-4 sm:items-center"
              >
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    {s.code && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                        {s.code}
                      </span>
                    )}
                    {s.riskLevelId && s.levelName ? (
                      <RiskLevelBadge
                        tone={s.levelTone}
                        label={s.levelName}
                      />
                    ) : (
                      <Badge variant="secondary">
                        {t("modules.riskSectors.unrated")}
                      </Badge>
                    )}
                    {!s.isActive && (
                      <Badge variant="secondary">{t("common.inactive")}</Badge>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {s.objectCount === 1
                      ? t("modules.riskSectors.objectCountOne")
                      : t("modules.riskSectors.objectCountMany", {
                          count: s.objectCount,
                        })}
                  </p>
                </div>
                {canManage && (
                  <SectorRowActions
                    orgSlug={params.orgSlug}
                    sector={{
                      id: s.id,
                      name: s.name,
                      code: s.code,
                      description: s.description,
                      riskLevelId: s.riskLevelId,
                      color: s.color,
                      sortOrder: s.sortOrder,
                      isActive: s.isActive,
                      objectCount: s.objectCount,
                    }}
                    levels={levelOptions}
                  />
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "primary" | "success";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className={toneCls}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
