import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { Building2, Plus, MapPin } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { company, companyObject } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import { CreateCompanyDialog } from "./create-company-dialog";

export const metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "companies:manage");

  const rows = await db
    .select({
      id: company.id,
      name: company.name,
      code: company.code,
      contactName: company.contactName,
      isActive: company.isActive,
      objectCount: sql<number>`count(${companyObject.id})::int`.as("object_count"),
    })
    .from(company)
    .leftJoin(companyObject, eq(companyObject.companyId, company.id))
    .where(eq(company.organizationId, m.organization.id))
    .groupBy(company.id)
    .orderBy(asc(company.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("modules.companies.title")}
        description={t("modules.companies.description")}
        actions={canManage ? <CreateCompanyDialog orgSlug={params.orgSlug} /> : null}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title={t("modules.companies.emptyTitle")}
          description={t("modules.companies.emptyDescription")}
          action={canManage ? <CreateCompanyDialog orgSlug={params.orgSlug} /> : null}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${params.orgSlug}/companies/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"
                >
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {c.code && <span className="font-mono">{c.code}</span>}
                      {c.contactName && <span>· {c.contactName}</span>}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {t("modules.companies.objectsCount", { count: c.objectCount })}
                      </span>
                    </p>
                  </div>
                  {!c.isActive && <Badge variant="secondary">{t("common.inactive")}</Badge>}
                  <Plus className="h-4 w-4 rotate-45 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
