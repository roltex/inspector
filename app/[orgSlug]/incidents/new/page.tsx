import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createIncident } from "../actions";
import { IncidentForm } from "./form";

export const metadata = { title: "Report incident" };

export default function NewIncidentPage({ params }: { params: { orgSlug: string } }) {
  async function submit(fd: FormData) {
    "use server";
    await createIncident(params.orgSlug, {
      title: String(fd.get("title") ?? ""),
      type: String(fd.get("type") ?? "OTHER"),
      severity: String(fd.get("severity") ?? "LOW"),
      description: String(fd.get("description") ?? ""),
      injuredPersonName: String(fd.get("injuredPersonName") ?? ""),
      bodyPart: String(fd.get("bodyPart") ?? ""),
      lostTimeDays: String(fd.get("lostTimeDays") ?? "0"),
      occurredAt: fd.get("occurredAt") ? String(fd.get("occurredAt")) : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Report incident" description="Capture the facts first; investigation follows." />
      <Card>
        <CardContent className="pt-6">
          <IncidentForm action={submit} />
        </CardContent>
      </Card>
    </div>
  );
}
