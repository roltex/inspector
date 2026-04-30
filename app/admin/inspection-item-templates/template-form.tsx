"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/i18n-provider";
import {
  createGlobalTemplate,
  updateGlobalTemplate,
} from "./actions";

type Mode = "create" | "edit";

interface InitialValues {
  id?: string;
  name?: string;
  description?: string | null;
  categoryName?: string | null;
  autoSeed?: boolean;
  isActive?: boolean;
  fields?: unknown[];
}

export function GlobalTemplateForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: InitialValues;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [autoSeed, setAutoSeed] = React.useState<boolean>(
    initial?.autoSeed ?? false,
  );
  const [isActive, setIsActive] = React.useState<boolean>(
    initial?.isActive ?? true,
  );

  // Pretty-print the fields JSON for inline editing. Empty array by default.
  const initialFieldsJson = React.useMemo(
    () => JSON.stringify(initial?.fields ?? [], null, 2),
    [initial?.fields],
  );
  const [fieldsJson, setFieldsJson] = React.useState(initialFieldsJson);
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  function parseFields(): unknown[] | null {
    try {
      const parsed = JSON.parse(fieldsJson);
      if (!Array.isArray(parsed)) {
        setJsonError(
          t("admin.inspectionItemTemplates.fieldsJsonMustBeArray"),
        );
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
      return null;
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = parseFields();
    if (fields === null) return;

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      categoryName: String(fd.get("categoryName") ?? "").trim() || null,
      autoSeed,
      isActive,
      fields,
    };
    start(async () => {
      try {
        if (mode === "edit" && initial?.id) {
          await updateGlobalTemplate(initial.id, payload);
          toast.success(t("modules.inspectionItemTemplates.updated"));
          router.refresh();
        } else {
          const { id } = await createGlobalTemplate(payload);
          toast.success(t("admin.inspectionItemTemplates.created"));
          router.push(`/admin/inspection-item-templates/${id}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("modules.inspectionItems.name")}</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initial?.name ?? ""}
            required
            minLength={1}
            maxLength={160}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoryName">
            {t("modules.inspectionItems.category")}
          </Label>
          <Input
            id="categoryName"
            name="categoryName"
            defaultValue={initial?.categoryName ?? ""}
            maxLength={120}
            placeholder={t("admin.inspectionItemTemplates.categoryPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          {t("modules.inspectionItems.descriptionField")}
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
          maxLength={1000}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-3">
          <input
            type="checkbox"
            checked={autoSeed}
            onChange={(e) => setAutoSeed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div>
            <div className="text-sm font-medium">
              {t("admin.inspectionItemTemplates.autoSeedLabelLong")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("admin.inspectionItemTemplates.autoSeedHint")}
            </div>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div>
            <div className="text-sm font-medium">
              {t("modules.inspectionItems.active")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("admin.inspectionItemTemplates.activeHint")}
            </div>
          </div>
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fields">
          {t("admin.inspectionItemTemplates.fieldsJsonLabel")}
        </Label>
        <Textarea
          id="fields"
          rows={12}
          value={fieldsJson}
          onChange={(e) => setFieldsJson(e.target.value)}
          className="font-mono text-xs"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          {t("admin.inspectionItemTemplates.fieldsJsonHint")}
        </p>
        {jsonError && (
          <p className="text-xs text-destructive">{jsonError}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "edit" ? t("common.save") : t("common.create")}
        </Button>
      </div>
    </form>
  );
}
