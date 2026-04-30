import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { incident } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { WhysEditor } from "./whys-editor";

export default async function IncidentDetail({
  params,
}: {
  params: { orgSlug: string; id: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const [row] = await db
    .select()
    .from(incident)
    .where(and(eq(incident.id, params.id), eq(incident.organizationId, m.organization.id)));
  if (!row) notFound();

  const whys = (row.rootCause?.whys as string[] | undefined) ?? ["", "", "", "", ""];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/${params.orgSlug}/incidents`}>
          <ArrowLeft className="h-4 w-4" /> All incidents
        </Link>
      </Button>

      <PageHeader
        title={row.title}
        description={`${row.type.replace("_", " ")} · Occurred ${formatDate(row.occurredAt, { dateStyle: "long", timeStyle: "short" })}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={
                row.severity === "CRITICAL"
                  ? "destructive"
                  : row.severity === "HIGH"
                    ? "warning"
                    : "secondary"
              }
            >
              {row.severity}
            </Badge>
            <Badge variant="outline">{row.status}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{row.description || "No description provided."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Injured person" value={row.injuredPersonName || "—"} />
            <Row label="Body part" value={row.bodyPart || "—"} />
            <Row label="Lost days" value={String(row.lostTimeDays ?? 0)} />
            <Row label="Reported" value={formatDate(row.createdAt)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Root cause — 5 Whys</CardTitle>
        </CardHeader>
        <CardContent>
          <WhysEditor orgSlug={params.orgSlug} incidentId={row.id} initial={whys} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
