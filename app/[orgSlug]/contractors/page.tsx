import { desc, eq } from "drizzle-orm";
import { Users, Plus, AlertTriangle } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { contractor } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { createContractor } from "./actions";
import { ContractorDialog } from "./contractor-dialog";

export const metadata = { title: "Contractors" };

export default async function Contractors({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(contractor)
    .where(eq(contractor.organizationId, m.organization.id))
    .orderBy(desc(contractor.createdAt));

  async function create(fd: FormData) {
    "use server";
    await createContractor(params.orgSlug, {
      name: String(fd.get("name") ?? ""),
      contactEmail: String(fd.get("contactEmail") ?? ""),
      contactPhone: String(fd.get("contactPhone") ?? ""),
      insuranceExpiresAt: fd.get("insuranceExpiresAt") ? String(fd.get("insuranceExpiresAt")) : undefined,
    });
  }

  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        description="Manage approved vendors, insurance expiry and safety ratings."
        actions={<ContractorDialog action={create} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No contractors yet"
          description="Add contractors to track insurance expiry and safety documentation."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((c) => {
              const expired = c.insuranceExpiresAt && c.insuranceExpiresAt < now;
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.contactEmail || c.contactPhone || "No contact"} · Insurance {c.insuranceExpiresAt ? `expires ${formatDate(c.insuranceExpiresAt)}` : "—"}
                    </p>
                  </div>
                  {expired && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3" /> Expired
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
