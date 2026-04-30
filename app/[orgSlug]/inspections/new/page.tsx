import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Building2, ListChecks } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  company,
  companyObject,
  inspectionItem,
  member,
  user,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n";
import { createInspection } from "../actions";
import { NewInspectionForm } from "./form";

export const metadata = { title: "New inspection" };
export const dynamic = "force-dynamic";

export default async function NewInspectionPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();

  // Pull all companies + their objects + items + workspace members in parallel.
  const [companies, objects, items, members] = await Promise.all([
    db
      .select({
        id: company.id,
        name: company.name,
        isActive: company.isActive,
      })
      .from(company)
      .where(and(eq(company.organizationId, m.organization.id), eq(company.isActive, true)))
      .orderBy(asc(company.name)),
    db
      .select({
        id: companyObject.id,
        companyId: companyObject.companyId,
        name: companyObject.name,
        type: companyObject.type,
        city: companyObject.city,
        isActive: companyObject.isActive,
      })
      .from(companyObject)
      .where(and(
        eq(companyObject.organizationId, m.organization.id),
        eq(companyObject.isActive, true),
      ))
      .orderBy(asc(companyObject.name)),
    db
      .select({
        id: inspectionItem.id,
        name: inspectionItem.name,
        description: inspectionItem.description,
        category: inspectionItem.category,
        sortOrder: inspectionItem.sortOrder,
      })
      .from(inspectionItem)
      .where(and(
        eq(inspectionItem.organizationId, m.organization.id),
        eq(inspectionItem.isActive, true),
      ))
      .orderBy(asc(inspectionItem.category), asc(inspectionItem.sortOrder), asc(inspectionItem.name)),
    db
      .select({
        userId: member.userId,
        name: user.name,
        email: user.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, m.organization.id))
      .orderBy(asc(user.name)),
  ]);

  // Group items by category for the checklist UI.
  const grouped = new Map<string, typeof items>();
  for (const it of items) {
    const list = grouped.get(it.category) ?? [];
    list.push(it);
    grouped.set(it.category, list);
  }
  const itemGroups = [...grouped.entries()].map(([category, list]) => ({ category, items: list }));

  async function submit(input: {
    companyId: string;
    objectId: string;
    assigneeId: string;
    scheduledFor: string | null;
    itemIds: string[];
  }) {
    "use server";
    await createInspection(params.orgSlug, input);
  }

  // Edge case: workspace has no companies yet — guide the user to set up first.
  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/${params.orgSlug}/inspections`}>
            <ArrowLeft className="h-4 w-4" /> {t("modules.inspections.backToList")}
          </Link>
        </Button>
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title={t("modules.inspections.noCompaniesTitle")}
          description={t("modules.inspections.noCompaniesDescription")}
          action={
            <Button asChild>
              <Link href={`/${params.orgSlug}/companies`}>
                {t("modules.inspections.goToCompanies")}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // INSPECTOR-role users can only create inspections assigned to themselves.
  const lockInspector = m.role === "INSPECTOR";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/${params.orgSlug}/inspections`}>
          <ArrowLeft className="h-4 w-4" /> {t("modules.inspections.backToList")}
        </Link>
      </Button>

      {items.length === 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <ListChecks className="h-5 w-5 shrink-0 text-warning" />
            <div className="flex-1">
              <p className="font-medium">{t("modules.inspections.noItemsTitle")}</p>
              <p className="text-muted-foreground">
                {t("modules.inspections.noItemsHint")}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${params.orgSlug}/inspection-items`}>
                {t("modules.inspections.manageItems")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <NewInspectionForm
            companies={companies}
            objects={objects}
            itemGroups={itemGroups}
            members={members}
            orgSlug={params.orgSlug}
            currentUserId={m.user.id}
            lockInspector={lockInspector}
            action={submit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
