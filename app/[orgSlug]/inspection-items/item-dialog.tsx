"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";
import {
  createInspectionItem,
  createInspectionItemCategory,
  updateInspectionItem,
} from "./actions";

interface ItemFormValues {
  id?: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

const ADD_NEW_VALUE = "__add_new__";

export function ItemDialog({
  orgSlug,
  trigger,
  initial,
  categories,
  onClosed,
}: {
  orgSlug: string;
  trigger?: React.ReactNode;
  initial?: ItemFormValues;
  categories: CategoryOption[];
  onClosed?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [creatingCat, startCreatingCat] = useTransition();
  const isEdit = Boolean(initial?.id);

  // Picked category (id) — defaults to the row's existing categoryId, falls
  // back to the first available, or empty when there are none yet.
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  // Local copy of categories so we can append a freshly created one without
  // a full page round-trip.
  const [localCategories, setLocalCategories] = useState<CategoryOption[]>(categories);

  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  function handleOpen(o: boolean) {
    setOpen(o);
    if (!o) {
      onClosed?.();
      setShowInlineCreate(false);
      setNewCategoryName("");
    } else {
      // Re-sync from props (server can have new categories now).
      setLocalCategories(categories);
      setCategoryId(initial?.categoryId ?? categories[0]?.id ?? "");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!categoryId) {
      toast.error(t("modules.inspectionItems.selectCategoryError"));
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? "") || null,
      categoryId,
      sortOrder: Number(fd.get("sortOrder") ?? 0),
      isActive: fd.get("isActive") === "on",
    };
    start(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateInspectionItem(orgSlug, initial.id, payload);
          toast.success(t("modules.inspectionItems.updated"));
        } else {
          await createInspectionItem(orgSlug, payload);
          toast.success(t("modules.inspectionItems.created"));
        }
        setOpen(false);
        onClosed?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onSelectChange(value: string) {
    if (value === ADD_NEW_VALUE) {
      setShowInlineCreate(true);
      return;
    }
    setCategoryId(value);
  }

  function onAddInlineCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) {
      toast.error(t("modules.inspectionItems.categoryNameTooShort"));
      return;
    }
    startCreatingCat(async () => {
      try {
        const created = await createInspectionItemCategory(orgSlug, {
          name,
          isActive: true,
        });
        setLocalCategories((prev) => [...prev, created]);
        setCategoryId(created.id);
        setNewCategoryName("");
        setShowInlineCreate(false);
        toast.success(t("modules.inspectionItems.categoryCreated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <Plus className="h-4 w-4" /> {t("modules.inspectionItems.new")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modules.inspectionItems.edit") : t("modules.inspectionItems.new")}
          </DialogTitle>
          <DialogDescription>{t("modules.inspectionItems.formHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("modules.inspectionItems.name")}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initial?.name ?? ""}
              required
              minLength={2}
              placeholder={t("modules.inspectionItems.namePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryId">{t("modules.inspectionItems.category")}</Label>
            {showInlineCreate ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t("modules.inspectionItems.categoryNamePlaceholder")}
                  autoFocus
                  minLength={2}
                  maxLength={100}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddInlineCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={onAddInlineCategory}
                  disabled={creatingCat}
                >
                  {creatingCat && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("common.add")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowInlineCreate(false);
                    setNewCategoryName("");
                  }}
                  disabled={creatingCat}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            ) : (
              <Select value={categoryId} onValueChange={onSelectChange}>
                <SelectTrigger id="categoryId">
                  <SelectValue
                    placeholder={
                      localCategories.length === 0
                        ? t("modules.inspectionItems.noCategoriesHint")
                        : t("modules.inspectionItems.selectCategory")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {localCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={ADD_NEW_VALUE}>
                    + {t("modules.inspectionItems.addCategory")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              {t("modules.inspectionItems.descriptionField")}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">{t("modules.inspectionItems.sortOrder")}</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={initial?.sortOrder ?? 0}
              />
            </div>
            <label className="flex items-end gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="h-4 w-4 rounded border-input"
              />
              {t("modules.inspectionItems.active")}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !categoryId}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
              {isEdit ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
