import { desc, eq, sql } from "drizzle-orm";
import { GraduationCap, AlertCircle } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { certification, trainingProgram } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { createProgram } from "./actions";
import { ProgramDialog } from "./program-dialog";

export const metadata = { title: "Training" };

export default async function Training({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const [programs, expiring] = await Promise.all([
    db
      .select()
      .from(trainingProgram)
      .where(eq(trainingProgram.organizationId, m.organization.id))
      .orderBy(desc(trainingProgram.createdAt)),
    db
      .select()
      .from(certification)
      .where(eq(certification.organizationId, m.organization.id))
      .orderBy(sql`${certification.expiresAt} asc nulls last`)
      .limit(20),
  ]);

  async function create(fd: FormData) {
    "use server";
    await createProgram(params.orgSlug, {
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      durationHours: String(fd.get("durationHours") ?? ""),
      validityMonths: String(fd.get("validityMonths") ?? ""),
      mandatory: fd.get("mandatory") === "on",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training & certifications"
        description="Keep your team competent, current and compliant."
        actions={<ProgramDialog action={create} />}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Programs
          </CardTitle>
        </CardHeader>
        {programs.length === 0 ? (
          <EmptyState className="m-5" title="No programs yet" description="Add your standard training programs." />
        ) : (
          <ul className="divide-y">
            {programs.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.durationHours ? `${p.durationHours}h · ` : ""}
                    {p.validityMonths ? `valid ${p.validityMonths} months` : "No expiry"}
                  </p>
                </div>
                {p.mandatory && <Badge variant="warning">Mandatory</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" /> Upcoming expiries
          </CardTitle>
        </CardHeader>
        {expiring.length === 0 ? (
          <EmptyState className="m-5" title="No certifications tracked" description="Issue certificates when users complete programs to track expiry." />
        ) : (
          <ul className="divide-y">
            {expiring.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">Certification</p>
                  <p className="text-xs text-muted-foreground">Expires {c.expiresAt ? formatDate(c.expiresAt) : "Never"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
