import { desc, eq } from "drizzle-orm";
import { Gavel, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { regulation, requirement } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { createRegulation, createRequirement } from "./actions";
import { ComplianceDialogs } from "./dialogs";

export const metadata = { title: "Compliance" };

export default async function Compliance({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const [regs, reqs] = await Promise.all([
    db.select().from(regulation).where(eq(regulation.organizationId, m.organization.id)).orderBy(desc(regulation.createdAt)),
    db.select().from(requirement).where(eq(requirement.organizationId, m.organization.id)).orderBy(desc(requirement.createdAt)),
  ]);

  async function addReg(fd: FormData) {
    "use server";
    await createRegulation(params.orgSlug, {
      code: String(fd.get("code") ?? ""),
      title: String(fd.get("title") ?? ""),
      jurisdiction: String(fd.get("jurisdiction") ?? ""),
      category: String(fd.get("category") ?? ""),
    });
  }

  async function addReq(fd: FormData) {
    "use server";
    await createRequirement(params.orgSlug, {
      title: String(fd.get("title") ?? ""),
      regulationId: String(fd.get("regulationId") ?? ""),
      dueDate: fd.get("dueDate") ? String(fd.get("dueDate")) : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance register"
        description="Track applicable regulations and your ongoing requirements."
        actions={
          <ComplianceDialogs
            regs={regs.map((r) => ({ id: r.id, title: r.title }))}
            onAddReg={addReg}
            onAddReq={addReq}
          />
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" /> Regulations
          </CardTitle>
        </CardHeader>
        {regs.length === 0 ? (
          <EmptyState className="m-5" title="No regulations added" description="Start by adding the rules that apply to your operations." />
        ) : (
          <ul className="divide-y">
            {regs.map((r) => (
              <li key={r.id} className="flex items-start gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.code && <span className="text-muted-foreground">{r.code} · </span>}
                    {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.jurisdiction || "—"}{r.category ? ` · ${r.category}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        {reqs.length === 0 ? (
          <EmptyState className="m-5" title="No requirements yet" description="Break each regulation into trackable requirements." />
        ) : (
          <ul className="divide-y">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {r.dueDate ? formatDate(r.dueDate) : "—"}
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
