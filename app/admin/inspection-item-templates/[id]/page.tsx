import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { getT } from "@/lib/i18n";
import { getGlobalTemplate } from "../actions";
import { GlobalTemplateForm } from "../template-form";

export const metadata = { title: "Edit global template" };
export const dynamic = "force-dynamic";

export default async function EditGlobalTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  await requireSuperAdmin();
  const { t } = await getT();

  let tpl;
  try {
    tpl = await getGlobalTemplate(params.id);
  } catch {
    notFound();
  }

  const fields = Array.isArray(tpl.fields) ? tpl.fields : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={tpl.name}
        description={t("admin.inspectionItemTemplates.editDescription")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/inspection-item-templates">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">
          {fields.length}{" "}
          {fields.length === 1
            ? t("modules.inspectionItemTemplates.field")
            : t("modules.inspectionItemTemplates.fields")}
        </Badge>
        {tpl.autoSeed && tpl.isActive && (
          <Badge variant="default">
            {t("modules.inspectionItemTemplates.autoSeedBadge")}
          </Badge>
        )}
        {!tpl.isActive && (
          <Badge variant="secondary">{t("common.inactive")}</Badge>
        )}
      </div>

      <Card className="p-4">
        <GlobalTemplateForm
          mode="edit"
          initial={{
            id: tpl.id,
            name: tpl.name,
            description: tpl.description,
            categoryName: tpl.categoryName,
            autoSeed: tpl.autoSeed,
            isActive: tpl.isActive,
            fields,
          }}
        />
      </Card>
    </div>
  );
}
