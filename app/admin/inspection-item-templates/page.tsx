import Link from "next/link";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { Bookmark, Globe2, Plus, Sparkles } from "lucide-react";
import { db } from "@/lib/db/client";
import { inspectionItem, inspectionItemTemplate } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { getT } from "@/lib/i18n";
import { GlobalTemplateRowActions } from "./row-actions";

export const metadata = { title: "Inspection form templates" };
export const dynamic = "force-dynamic";

export default async function AdminInspectionItemTemplatesPage() {
  await requireSuperAdmin();
  const { t } = await getT();

  const rows = await db
    .select()
    .from(inspectionItemTemplate)
    .where(isNull(inspectionItemTemplate.organizationId))
    .orderBy(asc(inspectionItemTemplate.name));

  // Show how many tenants currently have items derived from each template?
  // We don't track lineage, so just show fieldCount + autoSeed status.

  // Summary counts for the page header.
  const totals = {
    total: rows.length,
    autoSeed: rows.filter((r) => r.autoSeed && r.isActive).length,
    inactive: rows.filter((r) => !r.isActive).length,
  };

  // Tenant total (informational — tells the admin how many workspaces will
  // pick up new auto-seed templates next time they sign up).
  const [tenantCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(inspectionItem)
    .where(eq(inspectionItem.isActive, true))
    .limit(1);
  // Fallback for when there's literally no inspection item yet: it's purely
  // informational, so it's fine to leave as 0.
  void tenantCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.inspectionItemTemplates.title")}
        description={t("admin.inspectionItemTemplates.description")}
        actions={
          <Button asChild>
            <Link href="/admin/inspection-item-templates/new">
              <Plus className="h-4 w-4" />
              {t("admin.inspectionItemTemplates.new")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Bookmark className="h-4 w-4" />}
          label={t("admin.inspectionItemTemplates.totalLabel")}
          value={totals.total}
        />
        <Stat
          icon={<Sparkles className="h-4 w-4" />}
          label={t("admin.inspectionItemTemplates.autoSeedLabel")}
          value={totals.autoSeed}
          tone="success"
        />
        <Stat
          icon={<Globe2 className="h-4 w-4" />}
          label={t("admin.inspectionItemTemplates.inactiveLabel")}
          value={totals.inactive}
          tone="muted"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-5 w-5" />}
          title={t("admin.inspectionItemTemplates.emptyTitle")}
          description={t("admin.inspectionItemTemplates.emptyDescription")}
          action={
            <Button asChild>
              <Link href="/admin/inspection-item-templates/new">
                <Plus className="h-4 w-4" />
                {t("admin.inspectionItemTemplates.new")}
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((tpl) => {
              const fieldCount = Array.isArray(tpl.fields)
                ? tpl.fields.length
                : 0;
              return (
                <li
                  key={tpl.id}
                  className="flex items-start gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{tpl.name}</p>
                      {tpl.autoSeed && tpl.isActive && (
                        <Badge variant="default" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t("modules.inspectionItemTemplates.autoSeedBadge")}
                        </Badge>
                      )}
                      {!tpl.isActive && (
                        <Badge variant="secondary">
                          {t("common.inactive")}
                        </Badge>
                      )}
                      {tpl.categoryName && (
                        <Badge variant="outline">{tpl.categoryName}</Badge>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-sm text-muted-foreground">
                        {tpl.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {fieldCount}{" "}
                      {fieldCount === 1
                        ? t("modules.inspectionItemTemplates.field")
                        : t("modules.inspectionItemTemplates.fields")}
                    </p>
                  </div>
                  <GlobalTemplateRowActions
                    template={{
                      id: tpl.id,
                      name: tpl.name,
                      autoSeed: tpl.autoSeed,
                      isActive: tpl.isActive,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span
          className={
            tone === "success"
              ? "text-success"
              : tone === "muted"
                ? "text-muted-foreground"
                : "text-primary"
          }
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
