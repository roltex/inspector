import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Building2, MapPin, Mail, Phone } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { company, companyObject, riskSector } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/rbac/permissions";
import { getT } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/validators/risk-sectors";
import { RiskLevelBadge } from "../../risk-sectors/sector-badge";
import { CreateObjectDialog } from "./create-object-dialog";
import { CompanyDangerZone } from "./company-danger-zone";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: { orgSlug: string; id: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = can(m.role, "companies:manage");

  const [joined] = await db
    .select({
      company,
      sectorId: riskSector.id,
      sectorName: riskSector.name,
      sectorCode: riskSector.code,
      sectorRisk: riskSector.defaultRisk,
    })
    .from(company)
    .leftJoin(riskSector, eq(riskSector.id, company.riskSectorId))
    .where(and(eq(company.id, params.id), eq(company.organizationId, m.organization.id)))
    .limit(1);
  if (!joined) notFound();
  const row = joined.company;

  const objects = await db
    .select()
    .from(companyObject)
    .where(
      and(
        eq(companyObject.companyId, row.id),
        eq(companyObject.organizationId, m.organization.id),
      ),
    )
    .orderBy(asc(companyObject.name));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/${params.orgSlug}/companies`}>
          <ArrowLeft className="h-4 w-4" /> {t("modules.companies.backToList")}
        </Link>
      </Button>

      <PageHeader
        title={row.name}
        description={row.code ? `${t("modules.companies.code")}: ${row.code}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {joined.sectorId && joined.sectorRisk && (
              <RiskLevelBadge
                level={joined.sectorRisk as RiskLevel}
                label={joined.sectorName ?? "—"}
              />
            )}
            {!row.isActive && <Badge variant="secondary">{t("common.inactive")}</Badge>}
            {canManage && (
              <CreateObjectDialog orgSlug={params.orgSlug} companyId={row.id} />
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("modules.companies.contactInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t("modules.companies.contactName")} value={row.contactName ?? "—"} />
            <Row
              label={t("modules.companies.contactEmail")}
              value={
                row.contactEmail ? (
                  <a className="hover:underline" href={`mailto:${row.contactEmail}`}>
                    {row.contactEmail}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row label={t("modules.companies.contactPhone")} value={row.contactPhone ?? "—"} />
            <Row label={t("modules.companies.address")} value={row.address ?? "—"} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {t("modules.companies.objectsTitle")}
            </CardTitle>
            <span className="text-sm text-muted-foreground">{objects.length}</span>
          </CardHeader>
          <CardContent>
            {objects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("modules.companies.noObjects")}
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {objects.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{o.name}</p>
                        {o.type && <Badge variant="secondary">{o.type}</Badge>}
                        {!o.isActive && <Badge variant="secondary">{t("common.inactive")}</Badge>}
                      </div>
                      {(o.address || o.city) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[o.address, o.city, o.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {(o.managerName || o.managerEmail || o.managerPhone) && (
                        <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {o.managerName && <span>{o.managerName}</span>}
                          {o.managerEmail && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {o.managerEmail}
                            </span>
                          )}
                          {o.managerPhone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {o.managerPhone}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {row.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t("modules.companies.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {row.notes}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <CompanyDangerZone orgSlug={params.orgSlug} companyId={row.id} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
