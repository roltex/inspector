import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AlertTriangle, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { incident } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Incidents" };

export default async function Incidents({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(incident)
    .where(eq(incident.organizationId, m.organization.id))
    .orderBy(desc(incident.occurredAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="Report and investigate injuries, near-misses, environmental events and more."
        actions={
          <Button asChild size="lg">
            <Link href={`/${params.orgSlug}/incidents/new`}>
              <Plus className="h-4 w-4" /> Report incident
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="No incidents reported"
          description="Nothing to report is a good thing. When it matters, your team can log it fast."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/${params.orgSlug}/incidents/${i.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"
                >
                  <div className="rounded-xl bg-destructive/10 p-2.5 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.type.replace("_", " ")} · {formatRelative(i.occurredAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        i.severity === "CRITICAL"
                          ? "destructive"
                          : i.severity === "HIGH"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {i.severity}
                    </Badge>
                    <Badge variant="outline">{i.status}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
