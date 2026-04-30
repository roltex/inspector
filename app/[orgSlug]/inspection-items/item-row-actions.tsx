"use client";

import { useTransition } from "react";
import { Pencil, Trash2, Loader2, ListPlus, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { ItemDialog } from "./item-dialog";
import { FieldBuilderDialog } from "./field-builder";
import { deleteInspectionItem, saveItemAsTemplate } from "./actions";

export function ItemRowActions({
  orgSlug,
  item,
  categories,
}: {
  orgSlug: string;
  item: {
    id: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    category: string;
    sortOrder: number;
    isActive: boolean;
  };
  categories: { id: string; name: string }[];
}) {
  const t = useT();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!confirm(t("modules.inspectionItems.deleteConfirm"))) return;
    start(async () => {
      try {
        await deleteInspectionItem(orgSlug, item.id);
        toast.success(t("modules.inspectionItems.deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onSaveAsTemplate() {
    const proposedName = t("modules.inspectionItemTemplates.savePromptDefault", {
      name: item.name,
    });
    const name = window.prompt(
      t("modules.inspectionItemTemplates.savePrompt"),
      proposedName,
    );
    if (name === null) return; // cancelled
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("modules.inspectionItemTemplates.nameRequired"));
      return;
    }
    start(async () => {
      try {
        await saveItemAsTemplate(orgSlug, item.id, { name: trimmed });
        toast.success(t("modules.inspectionItemTemplates.savedAsTemplate"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <FieldBuilderDialog
        orgSlug={orgSlug}
        itemId={item.id}
        itemName={item.name}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            title={t("modules.inspectionItems.formBuilder")}
          >
            <ListPlus className="h-4 w-4" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onSaveAsTemplate}
        disabled={pending}
        title={t("modules.inspectionItemTemplates.saveAsTemplate")}
      >
        <BookmarkPlus className="h-4 w-4" />
      </Button>
      <ItemDialog
        orgSlug={orgSlug}
        initial={item}
        categories={categories}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
      </Button>
    </div>
  );
}
