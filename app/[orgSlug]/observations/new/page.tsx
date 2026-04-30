import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createObservation } from "../actions";
import { ObservationForm } from "./form";

export const metadata = { title: "New observation" };

export default function NewObservationPage({ params }: { params: { orgSlug: string } }) {
  async function submit(fd: FormData) {
    "use server";
    await createObservation(params.orgSlug, {
      type: String(fd.get("type")),
      description: String(fd.get("description") ?? ""),
      location: String(fd.get("location") ?? ""),
      severity: String(fd.get("severity") ?? "LOW"),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Report observation" description="60-second report — log what you saw on the floor." />
      <Card>
        <CardContent className="pt-6">
          <ObservationForm action={submit} />
        </CardContent>
      </Card>
    </div>
  );
}
