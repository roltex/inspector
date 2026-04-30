"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Loader2,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/i18n-provider";
import {
  applyTemplate,
  deleteWorkspaceTemplate,
  updateWorkspaceTemplate,
} from "../actions";

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  isActive: boolean;
}

export function WorkspaceTemplateRowActions({
  orgSlug,
  template,
}: {
  orgSlug: string;
  template: TemplateRow;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editOpen, setEditOpen] = React.useState(false);

  function onApply() {
    start(async () => {
      try {
        await applyTemplate(orgSlug, { templateId: template.id });
        toast.success(t("modules.inspectionItemTemplates.appliedToast"));
        router.push(`/${orgSlug}/inspection-items`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onToggle() {
    start(async () => {
      try {
        await updateWorkspaceTemplate(orgSlug, template.id, {
          isActive: !template.isActive,
        });
        toast.success(
          t(
            template.isActive
              ? "modules.inspectionItemTemplates.deactivated"
              : "modules.inspectionItemTemplates.activated",
          ),
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onDelete() {
    if (!confirm(t("modules.inspectionItemTemplates.deleteConfirm"))) return;
    start(async () => {
      try {
        await deleteWorkspaceTemplate(orgSlug, template.id);
        toast.success(t("modules.inspectionItemTemplates.deleted"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? "") || null,
      categoryName: String(fd.get("categoryName") ?? "") || null,
    };
    start(async () => {
      try {
        await updateWorkspaceTemplate(orgSlug, template.id, payload);
        toast.success(t("modules.inspectionItemTemplates.updated"));
        setEditOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onApply}
          disabled={pending}
          title={t("modules.inspectionItemTemplates.applyToWorkspace")}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditOpen(true)}
          disabled={pending}
          title={t("common.edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          disabled={pending}
          title={t(
            template.isActive
              ? "modules.inspectionItemTemplates.deactivate"
              : "modules.inspectionItemTemplates.activate",
          )}
        >
          <Power
            className={
              template.isActive
                ? "h-4 w-4 text-success"
                : "h-4 w-4 text-muted-foreground"
            }
          />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={pending}
          title={t("common.delete")}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("modules.inspectionItemTemplates.edit")}</DialogTitle>
            <DialogDescription>
              {t("modules.inspectionItemTemplates.editHint")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("modules.inspectionItems.name")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={template.name}
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
                defaultValue={template.categoryName ?? ""}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">
                {t("modules.inspectionItems.descriptionField")}
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={template.description ?? ""}
                maxLength={1000}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                disabled={pending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
