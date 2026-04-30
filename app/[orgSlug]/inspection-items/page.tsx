import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { Bookmark, ListChecks } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { inspectionItem, inspectionItemCategory } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import { ItemDialog } from "./item-dialog";
import { ItemRowActions } from "./item-row-actions";
import { CategoryManagerDialog, type CategoryRow } from "./category-manager";
import { TemplatePickerDialog } from "./template-picker-dialog";

export const metadata = { title: "Inspection items" };
export const dynamic = "force-dynamic";

export default async function InspectionItemsPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "inspectionItems:manage");

  const [items, categoryRows, countRows] = await Promise.all([
    db
      .select()
      .from(inspectionItem)
      .where(eq(inspectionItem.organizationId, m.organization.id))
      .orderBy(
        asc(inspectionItem.category),
        asc(inspectionItem.sortOrder),
        asc(inspectionItem.name),
      ),
    db
      .select()
      .from(inspectionItemCategory)
      .where(eq(inspectionItemCategory.organizationId, m.organization.id))
      .orderBy(asc(inspectionItemCategory.sortOrder), asc(inspectionItemCategory.name)),
    db
      .select({
        categoryId: inspectionItem.categoryId,
        c: sql<number>`count(*)::int`,
      })
      .from(inspectionItem)
      .where(eq(inspectionItem.organizationId, m.organization.id))
      .groupBy(inspectionItem.categoryId),
  ]);

  const usageByCategory = new Map<string, number>();
  for (const r of countRows) {
    if (r.categoryId) usageByCategory.set(r.categoryId, Number(r.c));
  }

  const categories: CategoryRow[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    itemCount: usageByCategory.get(c.id) ?? 0,
  }));

  // The dialog needs a lighter shape (just id + name).
  const categoryOptions = categories
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, name: c.name }));

  // Group items by category for display.
  const grouped = new Map<string, typeof items>();
  for (const r of items) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }
  const groups = [...grouped.entries()];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("modules.inspectionItems.title")}
        description={t("modules.inspectionItems.description")}
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="lg">
                <Link href={`/${params.orgSlug}/inspection-items/templates`}>
                  <Bookmark className="h-4 w-4" />
                  {t("modules.inspectionItemTemplates.manageTemplates")}
                </Link>
              </Button>
              <TemplatePickerDialog orgSlug={params.orgSlug} />
              <CategoryManagerDialog
                orgSlug={params.orgSlug}
                categories={categories}
              />
              <ItemDialog
                orgSlug={params.orgSlug}
                categories={categoryOptions}
              />
            </div>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" />}
          title={t("modules.inspectionItems.emptyTitle")}
          description={t("modules.inspectionItems.emptyDescription")}
          action={
            canManage ? (
              <ItemDialog
                orgSlug={params.orgSlug}
                categories={categoryOptions}
              />
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map(([category, rows]) => (
            <Card key={category} className="overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                <h3 className="font-medium">{category}</h3>
                <span className="text-xs text-muted-foreground">{rows.length}</span>
              </div>
              <ul className="divide-y">
                {rows.map((it) => (
                  <li key={it.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{it.name}</p>
                        {!it.isActive && (
                          <Badge variant="secondary">{t("common.inactive")}</Badge>
                        )}
                      </div>
                      {it.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {it.description}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <ItemRowActions
                        orgSlug={params.orgSlug}
                        categories={categoryOptions}
                        item={{
                          id: it.id,
                          name: it.name,
                          description: it.description,
                          categoryId: it.categoryId,
                          category: it.category,
                          sortOrder: it.sortOrder,
                          isActive: it.isActive,
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
