import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createPermit } from "../actions";
import { PermitForm } from "./form";

export const metadata = { title: "Request permit" };

export default function NewPermit({ params }: { params: { orgSlug: string } }) {
  async function submit(fd: FormData) {
    "use server";
    await createPermit(params.orgSlug, {
      title: String(fd.get("title") ?? ""),
      type: String(fd.get("type") ?? "GENERAL"),
      location: String(fd.get("location") ?? ""),
      workDescription: String(fd.get("workDescription") ?? ""),
      validFrom: fd.get("validFrom") ? String(fd.get("validFrom")) : undefined,
      validTo: fd.get("validTo") ? String(fd.get("validTo")) : undefined,
    });
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Request permit" description="Submit for approval. Work doesn't start until approved." />
      <Card>
        <CardContent className="pt-6">
          <PermitForm action={submit} />
        </CardContent>
      </Card>
    </div>
  );
}
