import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Eye, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { observation } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Observations" };

const TYPE_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  SAFE: "success",
  POSITIVE: "success",
  UNSAFE_ACT: "destructive",
  UNSAFE_CONDITION: "destructive",
  NEAR_MISS: "warning",
};

export default async function Observations({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(observation)
    .where(eq(observation.organizationId, m.organization.id))
    .orderBy(desc(observation.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observations"
        description="Behaviour-based safety: log unsafe acts, conditions and positive behaviours."
        actions={
          <Button asChild size="lg">
            <Link href={`/${params.orgSlug}/observations/new`}>
              <Plus className="h-4 w-4" /> Quick report
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Eye className="h-5 w-5" />}
          title="No observations yet"
          description="Encourage your team to log safe and unsafe conditions — leading indicators matter."
          action={
            <Button asChild>
              <Link href={`/${params.orgSlug}/observations/new`}>Log your first</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((o) => (
              <li key={o.id} className="flex items-start gap-4 px-5 py-4">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Eye className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{o.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.location ? `${o.location} · ` : ""}
                    {formatRelative(o.createdAt)}
                  </p>
                </div>
                <Badge variant={TYPE_VARIANT[o.type] ?? "secondary"}>
                  {o.type.replace("_", " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
