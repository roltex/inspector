import { ClipboardList, Gauge } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import { listRiskLevels } from "./actions";
import { LevelDialog } from "./level-dialog";
import { LevelRowActions } from "./row-actions";
import { RiskLevelBadge } from "../risk-sectors/sector-badge";

export const metadata = { title: "Risk levels" };
export const dynamic = "force-dynamic";

export default async function RiskLevelsPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "riskLevels:manage");

  const levels = await listRiskLevels(params.orgSlug);

  const totals = {
    total: levels.length,
    active: levels.filter((l) => l.isActive).length,
    forms: levels.reduce((sum, l) => sum + l.formCount, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("modules.riskLevels.title")}
        description={t("modules.riskLevels.description")}
        actions={canManage ? <LevelDialog orgSlug={params.orgSlug} /> : null}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label={t("modules.riskLevels.totalLabel")}
          value={totals.total}
          icon={<Gauge className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("modules.riskLevels.activeLabel")}
          value={totals.active}
          tone="success"
          icon={<Gauge className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("modules.riskLevels.usedByLabel")}
          value={totals.forms}
          tone="primary"
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </div>

      {levels.length === 0 ? (
        <EmptyState
          icon={<Gauge className="h-5 w-5" />}
          title={t("modules.riskLevels.emptyTitle")}
          description={t("modules.riskLevels.emptyDescription")}
          action={canManage ? <LevelDialog orgSlug={params.orgSlug} /> : null}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {levels.map((l) => (
              <li
                key={l.id}
                className="flex items-start gap-3 px-5 py-4 sm:items-center"
              >
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Gauge className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskLevelBadge tone={l.tone} label={l.name} />
                    {l.code && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                        {l.code}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {t("modules.riskLevels.scoreInline", { score: l.score })}
                    </span>
                    {!l.isActive && (
                      <Badge variant="secondary">{t("common.inactive")}</Badge>
                    )}
                  </div>
                  {l.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {l.description}
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClipboardList className="h-3 w-3" />
                    {l.formCount === 1
                      ? t("modules.riskLevels.formCountOne")
                      : t("modules.riskLevels.formCountMany", {
                          count: l.formCount,
                        })}
                  </p>
                </div>
                {canManage && (
                  <LevelRowActions
                    orgSlug={params.orgSlug}
                    level={{
                      id: l.id,
                      name: l.name,
                      code: l.code,
                      description: l.description,
                      tone: l.tone,
                      score: l.score,
                      sortOrder: l.sortOrder,
                      isActive: l.isActive,
                      formCount: l.formCount,
                    }}
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
