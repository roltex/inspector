import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileSignature, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { permit } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Permits" };

const STATUS: Record<string, "success" | "secondary" | "destructive" | "warning"> = {
  APPROVED: "success",
  ACTIVE: "success",
  REQUESTED: "warning",
  DRAFT: "secondary",
  SUSPENDED: "warning",
  CLOSED: "secondary",
  REJECTED: "destructive",
};

export default async function Permits({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(permit)
    .where(eq(permit.organizationId, m.organization.id))
    .orderBy(desc(permit.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permit to Work"
        description="Hot work, confined space, working at height and more — approvals in one place."
        actions={
          <Button asChild size="lg">
            <Link href={`/${params.orgSlug}/permits/new`}>
              <Plus className="h-4 w-4" /> Request permit
            </Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="h-5 w-5" />}
          title="No permits yet"
          description="Standardise approvals for high-risk work."
          action={
            <Button asChild>
              <Link href={`/${params.orgSlug}/permits/new`}>Request permit</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${params.orgSlug}/permits/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"
                >
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <FileSignature className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.type.replace("_", " ")}
                      {p.validFrom && p.validTo
                        ? ` · ${formatDate(p.validFrom)} → ${formatDate(p.validTo)}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS[p.status] ?? "secondary"}>{p.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
