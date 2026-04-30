"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n-provider";
import {
  createInspectionItemCategory,
  updateInspectionItemCategory,
  deleteInspectionItemCategory,
} from "./actions";

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  itemCount?: number;
}

export function CategoryManagerDialog({
  orgSlug,
  categories,
  trigger,
}: {
  orgSlug: string;
  categories: CategoryRow[];
  trigger?: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Local optimistic state — the server `revalidatePath` will refresh fully on close.
  const [list, setList] = useState<CategoryRow[]>(categories);

  // Sync from props when the dialog opens (covers fresh server data).
  function handleOpen(o: boolean) {
    setOpen(o);
    if (o) {
      setList(categories);
      setEditingId(null);
    }
  }

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (name.length < 2) {
      toast.error(t("modules.inspectionItems.categoryNameTooShort"));
      return;
    }
    const description = String(fd.get("description") ?? "").trim() || null;
    const sortOrder = Number(fd.get("sortOrder") ?? 0);

    const form = e.currentTarget;
    start(async () => {
      try {
        const created = await createInspectionItemCategory(orgSlug, {
          name,
          description,
          sortOrder,
          isActive: true,
        });
        setList((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            description,
            color: null,
            sortOrder,
            isActive: true,
            itemCount: 0,
          },
        ]);
        form.reset();
        toast.success(t("modules.inspectionItems.categoryCreated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onSaveEdit(c: CategoryRow, name: string, description: string | null) {
    if (name.trim().length < 2) {
      toast.error(t("modules.inspectionItems.categoryNameTooShort"));
      return;
    }
    start(async () => {
      try {
        await updateInspectionItemCategory(orgSlug, c.id, {
          name: name.trim(),
          description,
        });
        setList((prev) =>
          prev.map((x) =>
            x.id === c.id ? { ...x, name: name.trim(), description } : x,
          ),
        );
        setEditingId(null);
        toast.success(t("modules.inspectionItems.categoryUpdated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onDelete(c: CategoryRow) {
    if ((c.itemCount ?? 0) > 0) {
      toast.error(t("modules.inspectionItems.categoryHasItems"));
      return;
    }
    if (!confirm(t("modules.inspectionItems.categoryDeleteConfirm"))) return;
    start(async () => {
      try {
        await deleteInspectionItemCategory(orgSlug, c.id);
        setList((prev) => prev.filter((x) => x.id !== c.id));
        toast.success(t("modules.inspectionItems.categoryDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Tag className="h-4 w-4" />
            {t("modules.inspectionItems.manageCategories")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("modules.inspectionItems.categoriesTitle")}</DialogTitle>
          <DialogDescription>
            {t("modules.inspectionItems.categoriesDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Existing categories list */}
        <div className="max-h-[40vh] divide-y overflow-auto rounded-xl border">
          {list.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("modules.inspectionItems.noCategoriesYet")}
            </div>
          )}
          {list.map((c) => (
            <CategoryRowItem
              key={c.id}
              category={c}
              editing={editingId === c.id}
              pending={pending}
              onStartEdit={() => setEditingId(c.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(name, description) => onSaveEdit(c, name, description)}
              onDelete={() => onDelete(c)}
            />
          ))}
        </div>

        {/* Add new */}
        <form onSubmit={onCreate} className="space-y-3 rounded-xl border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("modules.inspectionItems.addCategory")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">
              {t("modules.inspectionItems.categoryName")}
            </Label>
            <Input
              id="cat-name"
              name="name"
              required
              minLength={2}
              maxLength={100}
              placeholder={t("modules.inspectionItems.categoryNamePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              id="cat-desc"
              name="description"
              placeholder={t("modules.inspectionItems.categoryDescriptionPlaceholder")}
            />
            <Input
              id="cat-sort"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={0}
              className="w-20"
              title={t("modules.inspectionItems.sortOrder")}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("modules.inspectionItems.addCategory")}
            </Button>
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row sub-component                                                         */
/* -------------------------------------------------------------------------- */

function CategoryRowItem({
  category,
  editing,
  pending,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  category: CategoryRow;
  editing: boolean;
  pending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (name: string, description: string | null) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");

  if (editing) {
    return (
      <div className="space-y-2 px-3 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={100}
          autoFocus
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("modules.inspectionItems.categoryDescriptionPlaceholder")}
        />
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            disabled={pending}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(name, description.trim() || null)}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("common.save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{category.name}</p>
          {(category.itemCount ?? 0) > 0 && (
            <Badge variant="secondary">{category.itemCount}</Badge>
          )}
        </div>
        {category.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {category.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={onStartEdit} disabled={pending}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={pending || (category.itemCount ?? 0) > 0}
          title={
            (category.itemCount ?? 0) > 0
              ? t("modules.inspectionItems.categoryHasItems")
              : undefined
          }
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
