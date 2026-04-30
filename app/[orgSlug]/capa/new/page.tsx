import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createAction } from "../actions";
import { ActionForm } from "./form";

export const metadata = { title: "New action" };

export default function NewAction({ params }: { params: { orgSlug: string } }) {
  async function submit(fd: FormData) {
    "use server";
    await createAction(params.orgSlug, {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      priority: String(fd.get("priority") ?? "MEDIUM"),
      dueDate: fd.get("dueDate") ? String(fd.get("dueDate")) : undefined,
    });
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New action" description="Assign, track and close the loop on corrective work." />
      <Card>
        <CardContent className="pt-6">
          <ActionForm action={submit} />
        </CardContent>
      </Card>
    </div>
  );
}
