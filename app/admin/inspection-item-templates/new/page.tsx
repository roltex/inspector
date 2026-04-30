import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { inspectionItemTemplate, organization } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { getT } from "@/lib/i18n";
import { GlobalTemplateForm } from "../template-form";
import { ImportFromWorkspaceTemplate } from "./import-form";

export const metadata = { title: "New global template" };
export const dynamic = "force-dynamic";

export default async function NewAdminGlobalTemplatePage() {
  await requireSuperAdmin();
  const { t } = await getT();

  // List every workspace-owned template the admin could promote to global —
  // simplest path for "I just authored this in my workspace, please make it
  // available to everyone".
  const candidates = await db
    .select({
      id: inspectionItemTemplate.id,
      name: inspectionItemTemplate.name,
      categoryName: inspectionItemTemplate.categoryName,
      orgName: organization.name,
      orgSlug: organization.slug,
    })
    .from(inspectionItemTemplate)
    .innerJoin(
      organization,
      eq(inspectionItemTemplate.organizationId, organization.id),
    )
    .orderBy(inspectionItemTemplate.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.inspectionItemTemplates.newTitle")}
        description={t("admin.inspectionItemTemplates.newDescription")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/inspection-item-templates">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
          </Button>
        }
      />

      {candidates.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold">
            {t("admin.inspectionItemTemplates.importFromWorkspaceTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.inspectionItemTemplates.importFromWorkspaceDescription")}
          </p>
          <ImportFromWorkspaceTemplate
            candidates={candidates.map((c) => ({
              id: c.id,
              name: c.name,
              categoryName: c.categoryName,
              orgName: c.orgName,
              orgSlug: c.orgSlug,
            }))}
          />
        </Card>
      )}

      <Card className="p-4">
        <h3 className="text-sm font-semibold">
          {t("admin.inspectionItemTemplates.fromScratchTitle")}
        </h3>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          {t("admin.inspectionItemTemplates.fromScratchDescription")}
        </p>
        <GlobalTemplateForm mode="create" />
      </Card>
    </div>
  );
}
