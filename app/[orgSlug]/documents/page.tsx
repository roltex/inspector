import { desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { document } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils";
import { createDocument } from "./actions";
import { CreateDocDialog } from "./create-dialog";

export const metadata = { title: "Documents" };

export default async function Documents({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(document)
    .where(eq(document.organizationId, m.organization.id))
    .orderBy(desc(document.updatedAt));

  async function create(fd: FormData) {
    "use server";
    await createDocument(params.orgSlug, {
      name: String(fd.get("name") ?? ""),
      category: String(fd.get("category") ?? ""),
      description: String(fd.get("description") ?? ""),
      requiresAck: fd.get("requiresAck") === "on",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Policies, SOPs and procedures — with versioning and acknowledgements."
        actions={<CreateDocDialog action={create} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No documents yet"
          description="Upload policies and require your team to acknowledge them."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((d) => (
              <li key={d.id} className="flex items-start gap-4 px-5 py-4">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.category ? `${d.category} · ` : ""}v{d.currentVersion} · Updated {formatRelative(d.updatedAt)}
                  </p>
                  {d.description && <p className="mt-1 line-clamp-2 text-sm">{d.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {d.requiresAck && <Badge variant="warning">Acknowledgement</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
