import { desc, eq } from "drizzle-orm";
import { HardHat, Plus, AlertTriangle } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ppeItem } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createPpeItem } from "./actions";
import { PpeDialog } from "./ppe-dialog";

export const metadata = { title: "PPE" };

export default async function Ppe({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(ppeItem)
    .where(eq(ppeItem.organizationId, m.organization.id))
    .orderBy(desc(ppeItem.createdAt));

  async function create(fd: FormData) {
    "use server";
    await createPpeItem(params.orgSlug, {
      name: String(fd.get("name") ?? ""),
      category: String(fd.get("category") ?? ""),
      stockQuantity: String(fd.get("stockQuantity") ?? "0"),
      minStock: String(fd.get("minStock") ?? "0"),
      unit: String(fd.get("unit") ?? "pcs"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PPE"
        description="Track stock, issuance and return of personal protective equipment."
        actions={<PpeDialog action={create} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<HardHat className="h-5 w-5" />}
          title="No PPE items yet"
          description="Add helmets, gloves, harnesses and other equipment."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((p) => {
              const low = (p.minStock ?? 0) > 0 && p.stockQuantity <= (p.minStock ?? 0);
              return (
                <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.category || "General"} · min {p.minStock} {p.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {low && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3" /> Low
                      </Badge>
                    )}
                    <div className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                      {p.stockQuantity} {p.unit}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
