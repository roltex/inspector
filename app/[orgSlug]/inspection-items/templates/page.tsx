import Link from "next/link";
import { ArrowLeft, Bookmark, Globe2, Sparkles } from "lucide-react";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { inspectionItemTemplate } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import { WorkspaceTemplateRowActions } from "./row-actions";

export const metadata = { title: "Inspection form templates" };
export const dynamic = "force-dynamic";

export default async function InspectionItemTemplatesPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "inspectionItems:manage");

  // Show workspace-owned + global templates side-by-side. Global ones are
  // read-only here (managed in /admin/inspection-item-templates).
  const rows = await db
    .select()
    .from(inspectionItemTemplate)
    .where(
      or(
        isNull(inspectionItemTemplate.organizationId),
        eq(inspectionItemTemplate.organizationId, m.organization.id),
      ),
    )
    .orderBy(asc(inspectionItemTemplate.name));

  const workspaceTemplates = rows.filter(
    (r) => r.organizationId === m.organization.id,
  );
  const globalTemplates = rows.filter((r) => r.organizationId === null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("modules.inspectionItemTemplates.title")}
        description={t("modules.inspectionItemTemplates.description")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${params.orgSlug}/inspection-items`}>
              <ArrowLeft className="h-4 w-4" />
              {t("modules.inspectionItemTemplates.backToItems")}
            </Link>
          </Button>
        }
      />

      {/* Workspace section */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {t("modules.inspectionItemTemplates.sectionWorkspace")}
          <span className="rounded-full bg-muted px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
            {workspaceTemplates.length}
          </span>
        </h2>
        {workspaceTemplates.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-5 w-5" />}
            title={t("modules.inspectionItemTemplates.workspaceEmptyTitle")}
            description={t(
              "modules.inspectionItemTemplates.workspaceEmptyDescription",
            )}
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {workspaceTemplates.map((tpl) => {
                const fields = Array.isArray(tpl.fields) ? tpl.fields.length : 0;
                return (
                  <li
                    key={tpl.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{tpl.name}</p>
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
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {tpl.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fields}{" "}
                        {fields === 1
                          ? t("modules.inspectionItemTemplates.field")
                          : t("modules.inspectionItemTemplates.fields")}
                      </p>
                    </div>
                    {canManage && (
                      <WorkspaceTemplateRowActions
                        orgSlug={params.orgSlug}
                        template={{
                          id: tpl.id,
                          name: tpl.name,
                          description: tpl.description,
                          categoryName: tpl.categoryName,
                          isActive: tpl.isActive,
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {/* Global section */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Globe2 className="h-4 w-4" />
          {t("modules.inspectionItemTemplates.sectionGlobal")}
          <span className="rounded-full bg-muted px-2 text-[11px] font-medium tabular-nums text-muted-foreground">
            {globalTemplates.length}
          </span>
        </h2>
        {globalTemplates.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
            {t("modules.inspectionItemTemplates.globalEmptyDescription")}
          </p>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {globalTemplates.map((tpl) => {
                const fields = Array.isArray(tpl.fields) ? tpl.fields.length : 0;
                return (
                  <li
                    key={tpl.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{tpl.name}</p>
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-primary/10 text-primary"
                        >
                          <Globe2 className="h-3 w-3" />
                          {t("modules.inspectionItemTemplates.scopeGlobal")}
                        </Badge>
                        {tpl.autoSeed && (
                          <Badge variant="default" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            {t("modules.inspectionItemTemplates.autoSeedBadge")}
                          </Badge>
                        )}
                        {tpl.categoryName && (
                          <Badge variant="outline">{tpl.categoryName}</Badge>
                        )}
                      </div>
                      {tpl.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {tpl.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fields}{" "}
                        {fields === 1
                          ? t("modules.inspectionItemTemplates.field")
                          : t("modules.inspectionItemTemplates.fields")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
