import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { Building2, Plus, MapPin } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { company, companyObject, riskSector } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/validators/risk-sectors";
import { RiskLevelBadge } from "../risk-sectors/sector-badge";
import { CreateCompanyDialog } from "./create-company-dialog";

export const metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "companies:manage");

  const [rows, sectorOptions] = await Promise.all([
    db
      .select({
        id: company.id,
        name: company.name,
        code: company.code,
        contactName: company.contactName,
        isActive: company.isActive,
        objectCount: sql<number>`count(${companyObject.id})::int`.as("object_count"),
        sectorId: riskSector.id,
        sectorName: riskSector.name,
        sectorCode: riskSector.code,
        sectorRisk: riskSector.defaultRisk,
      })
      .from(company)
      .leftJoin(companyObject, eq(companyObject.companyId, company.id))
      .leftJoin(riskSector, eq(riskSector.id, company.riskSectorId))
      .where(eq(company.organizationId, m.organization.id))
      .groupBy(company.id, riskSector.id)
      .orderBy(asc(company.name)),
    db
      .select({
        id: riskSector.id,
        name: riskSector.name,
        code: riskSector.code,
      })
      .from(riskSector)
      .where(
        and(
          eq(riskSector.organizationId, m.organization.id),
          eq(riskSector.isActive, true),
        ),
      )
      .orderBy(asc(riskSector.sortOrder), asc(riskSector.name)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("modules.companies.title")}
        description={t("modules.companies.description")}
        actions={
          canManage ? (
            <CreateCompanyDialog
              orgSlug={params.orgSlug}
              sectors={sectorOptions}
            />
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title={t("modules.companies.emptyTitle")}
          description={t("modules.companies.emptyDescription")}
          action={
            canManage ? (
              <CreateCompanyDialog
                orgSlug={params.orgSlug}
                sectors={sectorOptions}
              />
            ) : null
          }
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{c.name}</p>
                      {c.sectorId && c.sectorRisk && (
                        <RiskLevelBadge
                          level={c.sectorRisk as RiskLevel}
                          label={c.sectorName ?? "—"}
                        />
                      )}
                    </div>
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
