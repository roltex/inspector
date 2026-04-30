import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, Check, X } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { permit } from "@/lib/db/schema";
import { can } from "@/lib/rbac/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { approvePermit, rejectPermit } from "../actions";

export default async function PermitDetail({
  params,
}: {
  params: { orgSlug: string; id: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const [row] = await db
    .select()
    .from(permit)
    .where(and(eq(permit.id, params.id), eq(permit.organizationId, m.organization.id)));
  if (!row) notFound();

  const canApprove = can(m.role, "permits:approve");

  async function approve() {
    "use server";
    await approvePermit(params.orgSlug, params.id);
  }
  async function reject() {
    "use server";
    await rejectPermit(params.orgSlug, params.id);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/${params.orgSlug}/permits`}>
          <ArrowLeft className="h-4 w-4" /> All permits
        </Link>
      </Button>

      <PageHeader
        title={row.title}
        description={`${row.type.replace(/_/g, " ")} · ${row.location || "No location"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{row.status}</Badge>
            {canApprove && row.status === "REQUESTED" && (
              <>
                <form action={approve}>
                  <Button size="sm" type="submit">
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                </form>
                <form action={reject}>
                  <Button size="sm" variant="outline" type="submit">
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </form>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Work description</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{row.workDescription || "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Validity</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">From: </span>{row.validFrom ? formatDate(row.validFrom, { dateStyle: "medium", timeStyle: "short" }) : "—"}</div>
          <div><span className="text-muted-foreground">To: </span>{row.validTo ? formatDate(row.validTo, { dateStyle: "medium", timeStyle: "short" }) : "—"}</div>
          {row.approvedAt && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Approved: </span>
              {formatDate(row.approvedAt, { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
