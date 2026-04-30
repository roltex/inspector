import { desc, eq } from "drizzle-orm";
import { FlaskConical, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { chemical } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createChemical } from "./actions";
import { ChemDialog } from "./chem-dialog";

export const metadata = { title: "Chemicals" };

export default async function Chemicals({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(chemical)
    .where(eq(chemical.organizationId, m.organization.id))
    .orderBy(desc(chemical.createdAt));

  async function create(fd: FormData) {
    "use server";
    await createChemical(params.orgSlug, {
      name: String(fd.get("name") ?? ""),
      casNumber: String(fd.get("casNumber") ?? ""),
      manufacturer: String(fd.get("manufacturer") ?? ""),
      hazardClass: String(fd.get("hazardClass") ?? ""),
      signalWord: String(fd.get("signalWord") ?? ""),
      location: String(fd.get("location") ?? ""),
      quantity: String(fd.get("quantity") ?? ""),
      unit: String(fd.get("unit") ?? ""),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chemicals & SDS"
        description="Central library of hazardous substances, inventory and safety data sheets."
        actions={<ChemDialog action={create} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-5 w-5" />}
          title="No chemicals yet"
          description="Add hazardous substances your team handles."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.casNumber ? `CAS ${c.casNumber} · ` : ""}
                    {c.manufacturer || ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.signalWord && <Badge variant="warning">{c.signalWord}</Badge>}
                  {c.quantity != null && (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {c.quantity} {c.unit || ""}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
