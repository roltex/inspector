import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ShieldAlert, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { riskAssessment } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils";
import { createRiskAssessment } from "./actions";
import { CreateRiskDialog } from "./create-dialog";

export const metadata = { title: "Risk assessments" };

export default async function RiskList({ params }: { params: { orgSlug: string } }) {
  const m = await requireMembership(params.orgSlug);
  const rows = await db
    .select()
    .from(riskAssessment)
    .where(eq(riskAssessment.organizationId, m.organization.id))
    .orderBy(desc(riskAssessment.createdAt));

  async function create(fd: FormData) {
    "use server";
    await createRiskAssessment(params.orgSlug, {
      title: String(fd.get("title") ?? ""),
      activity: String(fd.get("activity") ?? ""),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk assessments"
        description="JSA/HIRA workflows with a 5x5 matrix, controls and residual risk."
        actions={<CreateRiskDialog action={create} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          title="No assessments yet"
          description="Create a risk assessment and evaluate hazards with our built-in 5x5 matrix."
          action={<CreateRiskDialog action={create} triggerLabel="Create assessment" />}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {rows.map((r) => {
              const hazards = r.hazards ?? [];
              const maxRisk = hazards.reduce((m, h) => Math.max(m, h.residualRisk ?? 0), 0);
              return (
                <li key={r.id}>
                  <Link
                    href={`/${params.orgSlug}/risk-assessments/${r.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {hazards.length} hazards · Updated {formatRelative(r.updatedAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      Max residual: {maxRisk || "—"}
                    </span>
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

function Plus_() {
  return <Plus className="h-4 w-4" />;
}
