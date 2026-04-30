import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { riskAssessment } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HazardMatrix } from "./hazard-matrix";

export default async function RiskDetail({
  params,
}: {
  params: { orgSlug: string; id: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const [row] = await db
    .select()
    .from(riskAssessment)
    .where(and(eq(riskAssessment.id, params.id), eq(riskAssessment.organizationId, m.organization.id)));
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/${params.orgSlug}/risk-assessments`}>
          <ArrowLeft className="h-4 w-4" /> All assessments
        </Link>
      </Button>

      <PageHeader title={row.title} description={row.activity || "Activity not specified"} />

      <Card>
        <CardHeader><CardTitle>Hazards & controls</CardTitle></CardHeader>
        <CardContent>
          <HazardMatrix
            orgSlug={params.orgSlug}
            id={row.id}
            initial={row.hazards ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
