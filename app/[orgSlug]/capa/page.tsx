import Link from "next/link";
import { sql, eq } from "drizzle-orm";
import { ListTodo, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { action } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { formatDate, formatRelative } from "@/lib/utils";

export const metadata = { title: "CAPA" };

export default async function CapaList({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(action)
    .where(eq(action.organizationId, m.organization.id))
    .orderBy(sql`${action.dueDate} asc nulls last, ${action.createdAt} desc`)
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrective & preventive actions"
        description="Track every action from observation to closure."
        actions={
          <Button asChild size="lg">
            <Link href={`/${params.orgSlug}/capa/new`}>
              <Plus className="h-4 w-4" /> New action
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-5 w-5" />}
          title="No actions yet"
          description="Create an action from an inspection finding, incident or manually."
          action={
            <Button asChild>
              <Link href={`/${params.orgSlug}/capa/new`}>New action</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((a) => {
              const overdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== "CLOSED";
              return (
                <li key={a.id}>
                  <Link
                    href={`/${params.orgSlug}/capa/${a.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <ListTodo className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {a.dueDate ? formatDate(a.dueDate) : "—"} · Created {formatRelative(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {overdue && <Badge variant="destructive">Overdue</Badge>}
                      <Badge
                        variant={
                          a.priority === "CRITICAL"
                            ? "destructive"
                            : a.priority === "HIGH"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {a.priority}
                      </Badge>
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
