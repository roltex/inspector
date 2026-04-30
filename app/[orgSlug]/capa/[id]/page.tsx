import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { action } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { StatusButtons } from "./status-buttons";

export default async function CapaDetail({
  params,
}: {
  params: { orgSlug: string; id: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const [row] = await db
    .select()
    .from(action)
    .where(and(eq(action.id, params.id), eq(action.organizationId, m.organization.id)));
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/${params.orgSlug}/capa`}>
          <ArrowLeft className="h-4 w-4" /> All actions
        </Link>
      </Button>

      <PageHeader
        title={row.title}
        description={`Due ${row.dueDate ? formatDate(row.dueDate, { dateStyle: "long" }) : "—"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={
                row.priority === "CRITICAL"
                  ? "destructive"
                  : row.priority === "HIGH"
                    ? "warning"
                    : "secondary"
              }
            >
              {row.priority}
            </Badge>
            <Badge variant="outline">{row.status}</Badge>
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{row.description || "No description provided."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
        <CardContent>
          <StatusButtons orgSlug={params.orgSlug} id={row.id} status={row.status} />
        </CardContent>
      </Card>
    </div>
  );
}
