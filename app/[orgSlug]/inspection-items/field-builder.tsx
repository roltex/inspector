"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ListPlus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import {
  listInspectionItemFields,
  createInspectionItemField,
  updateInspectionItemField,
  deleteInspectionItemField,
  reorderInspectionItemFields,
} from "./actions";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "select"
  | "multiselect"
  | "radio"
  | "multicheck"
  | "checkbox"
  | "date"
  | "datetime"
  | "time"
  | "rating"
  | "severity"
  | "photo"
  | "file"
  | "repeatable"
  | "table";

/** Sub-field type (no nesting — neither `repeatable` nor `table` allowed). */
export type SubFieldType = Exclude<FieldType, "repeatable" | "table">;

const OPTION_BACKED: FieldType[] = ["select", "multiselect", "radio", "multicheck"];
const ROW_BACKED: FieldType[] = ["repeatable", "table"];

export interface SubFieldDraft {
  key: string;
  label: string;
  type: SubFieldType;
  options: { value: string; label: string }[] | null;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
}

export type PresetRow = Record<string, unknown>;

export interface FieldRow {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options: { value: string; label: string }[] | null;
  subFields: SubFieldDraft[] | null;
  presetRows: PresetRow[] | null;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  sortOrder: number;
}

export function FieldBuilderDialog({
  orgSlug,
  itemId,
  itemName,
  trigger,
}: {
  orgSlug: string;
  itemId: string;
  itemName: string;
  trigger?: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listInspectionItemFields(orgSlug, itemId)
      .then((rows) => {
        setFields(
          rows.map((r) => ({
            id: r.id,
            key: r.key,
            label: r.label,
            type: (r.type as FieldType) ?? "text",
            options: r.options ?? null,
            subFields: ((r as { subFields?: SubFieldDraft[] | null }).subFields ?? null),
            presetRows: ((r as { presetRows?: PresetRow[] | null }).presetRows ?? null),
            required: r.required,
            placeholder: r.placeholder,
            helpText: r.helpText,
            sortOrder: r.sortOrder,
          })),
        );
        setLoading(false);
      })
      .catch((err: unknown) => {
        setLoading(false);
        toast.error(err instanceof Error ? err.message : "Error");
      });
  }, [open, orgSlug, itemId]);

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const a = next[idx]!;
    const b = next[target]!;
    next[idx] = b;
    next[target] = a;
    setFields(next);
    start(async () => {
      try {
        await reorderInspectionItemFields(orgSlug, itemId, next.map((f) => f.id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onCreate(data: NewFieldDraft) {
    start(async () => {
      try {
        const { id } = await createInspectionItemField(orgSlug, itemId, {
          ...data,
          sortOrder: fields.length,
        });
        setFields((prev) => [
          ...prev,
          {
            id,
            key: data.key,
            label: data.label,
            type: data.type,
            options: data.options ?? null,
            subFields: data.subFields ?? null,
            presetRows: data.presetRows ?? null,
            required: !!data.required,
            placeholder: data.placeholder ?? null,
            helpText: data.helpText ?? null,
            sortOrder: prev.length,
          },
        ]);
        toast.success(t("modules.inspectionItems.fieldCreated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onSave(field: FieldRow, patch: Partial<FieldRow>) {
    start(async () => {
      try {
        await updateInspectionItemField(orgSlug, field.id, patch);
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, ...patch } : f)),
        );
        setEditingId(null);
        toast.success(t("modules.inspectionItems.fieldUpdated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onDelete(field: FieldRow) {
    if (!confirm(t("modules.inspectionItems.fieldDeleteConfirm"))) return;
    start(async () => {
      try {
        await deleteInspectionItemField(orgSlug, field.id);
        setFields((prev) => prev.filter((f) => f.id !== field.id));
        toast.success(t("modules.inspectionItems.fieldDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" title={t("modules.inspectionItems.formBuilder")}>
            <ListPlus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-primary" />
            {t("modules.inspectionItems.formBuilderTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("modules.inspectionItems.formBuilderDescription").replace("{item}", itemName)}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              {t("modules.inspectionItems.noFieldsYet")}
            </div>
          ) : (
            <ul className="divide-y rounded-xl border">
              {fields.map((f, idx) => (
                <FieldListRow
                  key={f.id}
                  field={f}
                  editing={editingId === f.id}
                  pending={pending}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < fields.length - 1}
                  onStartEdit={() => setEditingId(f.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(patch) => onSave(f, patch)}
                  onDelete={() => onDelete(f)}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                />
              ))}
            </ul>
          )}
        </div>

        <NewFieldForm onSubmit={onCreate} pending={pending} />

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
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

interface NewFieldDraft {
  key: string;
  label: string;
  type: FieldType;
  options: { value: string; label: string }[] | null;
  subFields: SubFieldDraft[] | null;
  presetRows: PresetRow[] | null;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
}

const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "url",
  "select",
  "multiselect",
  "radio",
  "multicheck",
  "checkbox",
  "date",
  "datetime",
  "time",
  "rating",
  "severity",
  "photo",
  "file",
  "repeatable",
  "table",
];

const SUB_FIELD_TYPES: SubFieldType[] = FIELD_TYPES.filter(
  (t): t is SubFieldType => t !== "repeatable" && t !== "table",
);

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function parseOptions(text: string): { value: string; label: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [v, l] = line.split("=");
      const value = (v ?? "").trim();
      const lbl = (l ?? value).trim();
      return { value, label: lbl };
    })
    .filter((o) => o.value);
}

function NewFieldForm({
  onSubmit,
  pending,
}: {
  onSubmit: (data: NewFieldDraft) => void;
  pending: boolean;
}) {
  const t = useT();
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [helpText, setHelpText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [subFields, setSubFields] = useState<SubFieldDraft[]>([]);
  const [keyTouched, setKeyTouched] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) return;
    const finalKey = (keyValue.trim() || slugify(label)).slice(0, 60);
    if (!/^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/.test(finalKey)) {
      toast.error(t("modules.inspectionItems.fieldKeyInvalid"));
      return;
    }

    let options: { value: string; label: string }[] | null = null;
    if (OPTION_BACKED.includes(type)) {
      options = parseOptions(optionsText);
      if (options.length === 0) {
        toast.error(t("modules.inspectionItems.fieldOptionsRequired"));
        return;
      }
    }

    let outSubs: SubFieldDraft[] | null = null;
    if (ROW_BACKED.includes(type)) {
      const err = validateSubFields(subFields, t);
      if (err) {
        toast.error(err);
        return;
      }
      outSubs = subFields;
    }

    onSubmit({
      key: finalKey,
      label: label.trim(),
      type,
      options,
      subFields: outSubs,
      presetRows: null,
      required,
      placeholder: placeholder.trim() || null,
      helpText: helpText.trim() || null,
    });

    setLabel("");
    setKeyValue("");
    setKeyTouched(false);
    setRequired(false);
    setPlaceholder("");
    setHelpText("");
    setOptionsText("");
    setSubFields([]);
    setType("text");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border bg-muted/20 p-3"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("modules.inspectionItems.addField")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fld-label">{t("modules.inspectionItems.fieldLabel")}</Label>
          <Input
            id="fld-label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!keyTouched) setKeyValue(slugify(e.target.value));
            }}
            placeholder={t("modules.inspectionItems.fieldLabelPlaceholder")}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fld-key">{t("modules.inspectionItems.fieldKey")}</Label>
          <Input
            id="fld-key"
            value={keyValue}
            onChange={(e) => {
              setKeyTouched(true);
              setKeyValue(e.target.value);
            }}
            placeholder="e.g. pressure_reading"
            pattern="[a-z0-9](?:[a-z0-9_]*[a-z0-9])?"
            maxLength={60}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("modules.inspectionItems.fieldType")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft} value={ft}>
                  {t(`modules.inspectionItems.fieldType_${ft}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("modules.inspectionItems.fieldRequired")}
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fld-placeholder">
            {t("modules.inspectionItems.fieldPlaceholder")}
          </Label>
          <Input
            id="fld-placeholder"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            maxLength={200}
            placeholder={t("modules.inspectionItems.fieldPlaceholderHint")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fld-help">{t("modules.inspectionItems.fieldHelpText")}</Label>
          <Input
            id="fld-help"
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            maxLength={500}
            placeholder={t("modules.inspectionItems.fieldHelpTextHint")}
          />
        </div>
      </div>
      {OPTION_BACKED.includes(type) && (
        <div className="space-y-1">
          <Label htmlFor="fld-opts">{t("modules.inspectionItems.fieldOptions")}</Label>
          <Textarea
            id="fld-opts"
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={t("modules.inspectionItems.fieldOptionsPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">
            {t("modules.inspectionItems.fieldOptionsHelp")}
          </p>
        </div>
      )}
      {ROW_BACKED.includes(type) && (
        <SubFieldsEditor
          value={subFields}
          onChange={setSubFields}
          parentType={type as "repeatable" | "table"}
        />
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("modules.inspectionItems.addField")}
        </Button>
      </div>
    </form>
  );
}

function FieldListRow({
  field,
  editing,
  pending,
  canMoveUp,
  canMoveDown,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: FieldRow;
  editing: boolean;
  pending: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<FieldRow>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = useT();
  const [label, setLabel] = useState(field.label);
  const [keyValue, setKeyValue] = useState(field.key);
  const [type, setType] = useState<FieldType>(field.type);
  const [required, setRequired] = useState(field.required);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [helpText, setHelpText] = useState(field.helpText ?? "");
  const [optionsText, setOptionsText] = useState(
    (field.options ?? []).map((o) => `${o.value}=${o.label}`).join("\n"),
  );
  const [subFields, setSubFields] = useState<SubFieldDraft[]>(field.subFields ?? []);
  const [presetRows, setPresetRows] = useState<PresetRow[]>(field.presetRows ?? []);

  if (editing) {
    return (
      <li className="space-y-3 bg-muted/20 px-3 py-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("modules.inspectionItems.fieldLabel")}</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("modules.inspectionItems.fieldKey")}</Label>
            <Input
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              pattern="[a-z0-9](?:[a-z0-9_]*[a-z0-9])?"
              maxLength={60}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("modules.inspectionItems.fieldType")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft} value={ft}>
                    {t(`modules.inspectionItems.fieldType_${ft}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {t("modules.inspectionItems.fieldRequired")}
            </label>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              {t("modules.inspectionItems.fieldPlaceholder")}
            </Label>
            <Input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              maxLength={200}
              placeholder={t("modules.inspectionItems.fieldPlaceholderHint")}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              {t("modules.inspectionItems.fieldHelpText")}
            </Label>
            <Textarea
              rows={2}
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              maxLength={500}
              placeholder={t("modules.inspectionItems.fieldHelpTextHint")}
            />
          </div>
          {OPTION_BACKED.includes(type) && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">{t("modules.inspectionItems.fieldOptions")}</Label>
              <Textarea
                rows={3}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={t("modules.inspectionItems.fieldOptionsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("modules.inspectionItems.fieldOptionsHelp")}
              </p>
            </div>
          )}
          {ROW_BACKED.includes(type) && (
            <div className="space-y-3 sm:col-span-2">
              <SubFieldsEditor
                value={subFields}
                onChange={setSubFields}
                parentType={type as "repeatable" | "table"}
              />
              {subFields.length > 0 && (
                <PresetRowsEditor
                  subFields={subFields}
                  value={presetRows}
                  onChange={setPresetRows}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={pending}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!label.trim()) return;
              const trimmedKey = keyValue.trim().slice(0, 60);
              if (!/^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/.test(trimmedKey)) {
                toast.error(t("modules.inspectionItems.fieldKeyInvalid"));
                return;
              }
              const patch: Partial<FieldRow> = {
                label: label.trim(),
                key: trimmedKey,
                type,
                required,
                placeholder: placeholder.trim() || null,
                helpText: helpText.trim() || null,
              };
              if (OPTION_BACKED.includes(type)) {
                const opts = parseOptions(optionsText);
                if (opts.length === 0) {
                  toast.error(t("modules.inspectionItems.fieldOptionsRequired"));
                  return;
                }
                patch.options = opts;
              } else {
                patch.options = null;
              }
              if (ROW_BACKED.includes(type)) {
                const err = validateSubFields(subFields, t);
                if (err) {
                  toast.error(err);
                  return;
                }
                patch.subFields = subFields;
                // Strip preset values whose key no longer exists.
                const validKeys = new Set(subFields.map((sf) => sf.key));
                patch.presetRows = presetRows
                  .map((r) =>
                    Object.fromEntries(
                      Object.entries(r).filter(([k]) => validKeys.has(k)),
                    ),
                  )
                  .filter((r) => Object.keys(r).length > 0);
                if ((patch.presetRows as PresetRow[]).length === 0) {
                  patch.presetRows = null;
                }
              } else {
                patch.subFields = null;
                patch.presetRows = null;
              }
              onSave(patch);
            }}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("common.save")}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 px-3 py-2.5">
      <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{field.label}</p>
          <Badge variant="outline" className="text-[10px] uppercase">
            {t(`modules.inspectionItems.fieldType_${field.type}`)}
          </Badge>
          {field.required && (
            <Badge variant="secondary">{t("modules.inspectionItems.fieldRequired")}</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {field.key}
        </p>
        {OPTION_BACKED.includes(field.type) && field.options && field.options.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {field.options.map((o) => o.label).join(" · ")}
          </p>
        )}
        {ROW_BACKED.includes(field.type) && field.subFields && field.subFields.length > 0 && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Layers className="h-3 w-3 shrink-0" />
            {field.subFields.map((sf) => sf.label).join(" · ")}
            {field.presetRows && field.presetRows.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {field.presetRows.length} preset
              </span>
            )}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={pending || !canMoveUp}
          title={t("common.moveUp")}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={pending || !canMoveDown}
          title={t("common.moveDown")}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onStartEdit} disabled={pending}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-fields editor (used when type=repeatable)                             */
/* -------------------------------------------------------------------------- */

function validateSubFields(
  subs: SubFieldDraft[],
  t: (k: string) => string,
): string | null {
  if (subs.length === 0) return t("modules.inspectionItems.subFieldsRequired");
  const seen = new Set<string>();
  for (const sf of subs) {
    if (!sf.label.trim()) return t("modules.inspectionItems.fieldLabel");
    if (!/^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/.test(sf.key)) {
      return t("modules.inspectionItems.fieldKeyInvalid");
    }
    if (seen.has(sf.key)) {
      return `${t("modules.inspectionItems.fieldKey")}: "${sf.key}"`;
    }
    seen.add(sf.key);
    if (
      OPTION_BACKED.includes(sf.type as FieldType) &&
      (!sf.options || sf.options.length === 0)
    ) {
      return t("modules.inspectionItems.fieldOptionsRequired");
    }
  }
  return null;
}

function SubFieldsEditor({
  value,
  onChange,
  parentType,
}: {
  value: SubFieldDraft[];
  onChange: (v: SubFieldDraft[]) => void;
  parentType: "repeatable" | "table";
}) {
  const t = useT();
  const isTable = parentType === "table";
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [type, setType] = useState<SubFieldType>("text");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  function addSub() {
    if (!label.trim()) return;
    const finalKey = (keyValue.trim() || slugify(label)).slice(0, 60);
    if (!/^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/.test(finalKey)) {
      toast.error(t("modules.inspectionItems.fieldKeyInvalid"));
      return;
    }
    if (value.some((s) => s.key === finalKey)) {
      toast.error(`${t("modules.inspectionItems.fieldKey")}: "${finalKey}"`);
      return;
    }
    let options: { value: string; label: string }[] | null = null;
    if (OPTION_BACKED.includes(type as FieldType)) {
      options = parseOptions(optionsText);
      if (options.length === 0) {
        toast.error(t("modules.inspectionItems.fieldOptionsRequired"));
        return;
      }
    }
    onChange([
      ...value,
      {
        key: finalKey,
        label: label.trim(),
        type,
        options,
        required,
        placeholder: null,
        helpText: null,
      },
    ]);
    setLabel("");
    setKeyValue("");
    setKeyTouched(false);
    setRequired(false);
    setOptionsText("");
    setType("text");
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function moveAt(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const a = next[idx]!;
    const b = next[target]!;
    next[idx] = b;
    next[target] = a;
    onChange(next);
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium uppercase tracking-wide">
          {isTable
            ? t("modules.inspectionItems.tableColumns")
            : t("modules.inspectionItems.subFields")}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {isTable
          ? t("modules.inspectionItems.tableColumnsHelp")
          : t("modules.inspectionItems.subFieldsHelp")}
      </p>
      {value.length > 0 && (
        <ul className="divide-y rounded-xl border bg-background">
          {value.map((sf, idx) => (
            <li key={`${sf.key}-${idx}`} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{sf.label}</p>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {t(`modules.inspectionItems.fieldType_${sf.type}`)}
                  </Badge>
                  {sf.required && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t("modules.inspectionItems.fieldRequired")}
                    </Badge>
                  )}
                </div>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {sf.key}
                </p>
                {sf.options && sf.options.length > 0 && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {sf.options.map((o) => o.label).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAt(idx, -1)}
                  disabled={idx === 0}
                  title={t("common.moveUp")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAt(idx, 1)}
                  disabled={idx === value.length - 1}
                  title={t("common.moveDown")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAt(idx)}
                  title={t("common.remove")}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("modules.inspectionItems.fieldLabel")}</Label>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!keyTouched) setKeyValue(slugify(e.target.value));
            }}
            placeholder={t("modules.inspectionItems.fieldLabelPlaceholder")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("modules.inspectionItems.fieldKey")}</Label>
          <Input
            value={keyValue}
            onChange={(e) => {
              setKeyTouched(true);
              setKeyValue(e.target.value);
            }}
            pattern="[a-z0-9](?:[a-z0-9_]*[a-z0-9])?"
            maxLength={60}
            placeholder="e.g. worker_name"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("modules.inspectionItems.fieldType")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as SubFieldType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUB_FIELD_TYPES.map((ft) => (
                <SelectItem key={ft} value={ft}>
                  {t(`modules.inspectionItems.fieldType_${ft}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("modules.inspectionItems.fieldRequired")}
          </label>
        </div>
        {OPTION_BACKED.includes(type as FieldType) && (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">{t("modules.inspectionItems.fieldOptions")}</Label>
            <Textarea
              rows={2}
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder={t("modules.inspectionItems.fieldOptionsPlaceholder")}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={addSub}>
          <Plus className="h-4 w-4" />
          {isTable
            ? t("modules.inspectionItems.addColumn")
            : t("modules.inspectionItems.addSubField")}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Preset rows editor — pre-defines rows that auto-populate the form.        */
/* -------------------------------------------------------------------------- */

function PresetRowsEditor({
  subFields,
  value,
  onChange,
}: {
  subFields: SubFieldDraft[];
  value: PresetRow[];
  onChange: (v: PresetRow[]) => void;
}) {
  const t = useT();

  function addRow() {
    onChange([...(value ?? []), {}]);
  }

  function removeRow(idx: number) {
    onChange((value ?? []).filter((_, i) => i !== idx));
  }

  function updateCell(idx: number, key: string, v: unknown) {
    const next = [...(value ?? [])];
    const empty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "");
    const row = { ...(next[idx] ?? {}) };
    if (empty) delete row[key];
    else row[key] = v;
    next[idx] = row;
    onChange(next);
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide">
          {t("modules.inspectionItems.presetRows")}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {value.length}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("modules.inspectionItems.presetRowsHelp")}
      </p>
      {value.length > 0 && (
        <div className="overflow-auto rounded-xl border bg-background">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8 px-2 py-1.5 font-medium">#</th>
                {subFields.map((sf) => (
                  <th key={sf.key} className="px-2 py-1.5 font-medium">
                    {sf.label}
                  </th>
                ))}
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {value.map((row, idx) => (
                <tr key={idx} className="align-top">
                  <td className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                    {idx + 1}
                  </td>
                  {subFields.map((sf) => (
                    <td key={sf.key} className="border-t px-2 py-1.5">
                      <PresetCellInput
                        sub={sf}
                        value={row?.[sf.key]}
                        onChange={(v) => updateCell(idx, sf.key, v)}
                      />
                    </td>
                  ))}
                  <td className="border-t px-2 py-1.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      title={t("common.remove")}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          {t("modules.inspectionItems.addPresetRow")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact input for one preset cell. Renders a type-appropriate native input
 * for each sub-field type (text/number/date/select/checkbox). Admins leave
 * cells empty to keep them editable in the inspector form.
 */
function PresetCellInput({
  sub,
  value,
  onChange,
}: {
  sub: SubFieldDraft;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const t = useT();
  const placeholder = `— ${t("modules.inspectionItems.presetCellEmpty")} —`;

  switch (sub.type) {
    case "number":
    case "rating":
      return (
        <Input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder={placeholder}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "time":
      return (
        <Input
          type="time"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "checkbox":
      return (
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked || "")}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-muted-foreground">
            {value === true
              ? t("common.yes")
              : t("modules.inspectionItems.presetCellEmpty")}
          </span>
        </label>
      );
    case "select":
    case "radio":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-xl border border-input bg-background px-2 text-sm"
        >
          <option value="">{placeholder}</option>
          {(sub.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "severity":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-xl border border-input bg-background px-2 text-sm"
        >
          <option value="">{placeholder}</option>
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <Textarea
          rows={1}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );
    case "multiselect":
    case "multicheck": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {(sub.options ?? []).map((o) => {
            const checked = arr.includes(o.value);
            return (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]",
                  checked
                    ? "border-primary bg-primary/10"
                    : "border-input hover:bg-accent",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arr, o.value]
                      : arr.filter((x) => x !== o.value);
                    onChange(next.length === 0 ? "" : next);
                  }}
                  className="h-3 w-3 accent-primary"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      );
    }
    case "photo":
    case "file":
      return (
        <span className="text-[11px] italic text-muted-foreground">
          {t("modules.inspectionItems.presetCellNotSupported")}
        </span>
      );
    default:
      return (
        <Input
          type={sub.type === "email" ? "email" : sub.type === "url" ? "url" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      );
  }
}
