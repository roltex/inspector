"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  File as FileIcon,
  Layers,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  XCircle,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Combobox } from "@/components/ui/combobox";
import { UploadField, type UploadedAsset } from "@/components/ui/upload-field";
import { useT } from "@/components/i18n-provider";
import { cn, formatDate } from "@/lib/utils";
import { addFinding, deleteFinding, updateFinding } from "../actions";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SEVERITY_BADGE_VARIANT: Record<Severity, "default" | "secondary" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "secondary",
  HIGH: "default",
  CRITICAL: "destructive",
};

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

/** Sub-field definition (no nesting — neither `repeatable` nor `table`). */
export interface SubFieldDef {
  key: string;
  label: string;
  type: Exclude<FieldType, "repeatable" | "table">;
  required: boolean;
  options: { value: string; label: string }[] | null;
  placeholder: string | null;
  helpText: string | null;
}

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: { value: string; label: string }[] | null;
  /** When type === "repeatable" / "table", the sub-field schema for each row. */
  subFields: SubFieldDef[] | null;
  /**
   * Pre-defined rows that auto-populate the inspector's table. Cells with a
   * preset value are read-only; other cells remain editable.
   */
  presetRows: Array<Record<string, unknown>> | null;
  placeholder: string | null;
  helpText: string | null;
}

export interface FindingRow {
  id: string;
  description: string;
  severity: Severity;
  values: Record<string, unknown> | null;
  createdAt: string | Date;
}

export function ItemFindingsSection({
  orgSlug,
  organizationId,
  inspectionId,
  selectionId,
  itemLabel,
  fields,
  findings,
  canEdit,
}: {
  orgSlug: string;
  organizationId: string;
  inspectionId: string;
  selectionId: string;
  itemLabel: string;
  fields: FieldDef[];
  findings: FindingRow[];
  canEdit: boolean;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [list, setList] = useState<FindingRow[]>(findings);

  function onAdded(row: FindingRow) {
    setList((prev) => [row, ...prev]);
    setAdding(false);
  }

  function onUpdated(id: string, row: FindingRow) {
    setList((prev) => prev.map((f) => (f.id === id ? row : f)));
    setEditingId(null);
  }

  function onDelete(id: string) {
    if (!confirm(t("modules.inspections.findingDeleteConfirm"))) return;
    start(async () => {
      try {
        await deleteFinding(orgSlug, id);
        setList((prev) => prev.filter((f) => f.id !== id));
        if (editingId === id) setEditingId(null);
        toast.success(t("modules.inspections.findingDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onEdit(id: string) {
    setAdding(false);
    setEditingId(id);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("modules.inspections.findings")}{" "}
          <span className="text-foreground">({list.length})</span>
        </p>
        {canEdit && (
          <Button
            size="sm"
            variant={adding ? "ghost" : "outline"}
            onClick={() => {
              setEditingId(null);
              setAdding((o) => !o);
            }}
          >
            {adding ? null : <Plus className="h-4 w-4" />}
            {adding
              ? t("common.cancel")
              : t("modules.inspections.addFinding")}
          </Button>
        )}
      </div>

      {adding && canEdit && (
        <FindingComposer
          mode="create"
          orgSlug={orgSlug}
          organizationId={organizationId}
          inspectionId={inspectionId}
          selectionId={selectionId}
          itemLabel={itemLabel}
          fields={fields}
          onAdded={onAdded}
          onCancel={() => setAdding(false)}
        />
      )}

      {list.length === 0 ? (
        <p className="rounded-xl border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          {t("modules.inspections.noFindings")}
        </p>
      ) : (
        <FindingsTable
          orgSlug={orgSlug}
          organizationId={organizationId}
          inspectionId={inspectionId}
          selectionId={selectionId}
          itemLabel={itemLabel}
          fields={fields}
          findings={list}
          canEdit={canEdit}
          pending={pending}
          editingId={editingId}
          onEdit={onEdit}
          onCancelEdit={() => setEditingId(null)}
          onUpdated={onUpdated}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Findings table (desktop) + stacked cards (mobile)                         */
/* -------------------------------------------------------------------------- */

function FindingsTable({
  orgSlug,
  organizationId,
  inspectionId,
  selectionId,
  itemLabel,
  fields,
  findings,
  canEdit,
  pending,
  editingId,
  onEdit,
  onCancelEdit,
  onUpdated,
  onDelete,
}: {
  orgSlug: string;
  organizationId: string;
  inspectionId: string;
  selectionId: string;
  itemLabel: string;
  fields: FieldDef[];
  findings: FindingRow[];
  canEdit: boolean;
  pending: boolean;
  editingId: string | null;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onUpdated: (id: string, row: FindingRow) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const totalCols = fields.length + 1 + (canEdit ? 1 : 0);

  function renderEditor(f: FindingRow) {
    return (
      <FindingComposer
        mode="edit"
        findingId={f.id}
        initialValues={(f.values ?? {}) as Record<string, unknown>}
        initialSeverity={f.severity}
        orgSlug={orgSlug}
        organizationId={organizationId}
        inspectionId={inspectionId}
        selectionId={selectionId}
        itemLabel={itemLabel}
        fields={fields}
        onUpdated={(row) => onUpdated(f.id, row)}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <>
      {/* Desktop: data table */}
      <div className="hidden overflow-auto rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {fields.map((f) => (
                <th key={f.id} className="px-3 py-2 font-medium">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </th>
              ))}
              <th className="px-3 py-2 font-medium">
                {t("modules.inspections.created")}
              </th>
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {findings.map((f) =>
              editingId === f.id ? (
                <tr key={f.id} className="bg-muted/10">
                  <td colSpan={totalCols} className="p-3">
                    {renderEditor(f)}
                  </td>
                </tr>
              ) : (
                <tr key={f.id} className="align-top">
                  {fields.map((fd) => (
                    <td key={fd.id} className="px-3 py-2">
                      <ValueCell field={fd} value={(f.values ?? {})[fd.key]} />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {formatDate(f.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(f.id)}
                          disabled={pending}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(f.id)}
                          disabled={pending}
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {findings.map((f) =>
          editingId === f.id ? (
            <div key={f.id} className="rounded-xl border bg-muted/10 p-2">
              {renderEditor(f)}
            </div>
          ) : (
            <div key={f.id} className="rounded-xl border bg-card p-3">
              <div className="mb-2 flex items-center justify-end">
                <span className="text-xs text-muted-foreground">
                  {formatDate(f.createdAt, { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <dl className="space-y-3 text-sm">
                {fields.map((fd) => {
                  const value = (f.values ?? {})[fd.key];
                  if (value == null || value === "") return null;
                  return (
                    <div key={fd.id} className="space-y-1">
                      <dt className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {fd.label}
                      </dt>
                      <dd className="m-0 min-w-0 break-words">
                        <ValueCell field={fd} value={value} />
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {canEdit && (
                <div className="mt-2 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(f.id)}
                    disabled={pending}
                  >
                    <Pencil className="h-4 w-4" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(f.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    {t("common.delete")}
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </>
  );
}

export function ValueCell({ field, value }: { field: FieldDef; value: unknown }) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
    return <span className="text-muted-foreground">—</span>;
  switch (field.type) {
    case "checkbox":
      return value ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      );
    case "date":
      return <span>{formatDate(String(value), { dateStyle: "medium" })}</span>;
    case "datetime":
      return (
        <span>
          {formatDate(String(value), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      );
    case "time":
      return <span className="font-mono">{String(value)}</span>;
    case "select":
    case "radio": {
      const opt = (field.options ?? []).find((o) => o.value === String(value));
      return <span>{opt?.label ?? String(value)}</span>;
    }
    case "multiselect":
    case "multicheck": {
      const arr = Array.isArray(value) ? (value as string[]) : [String(value)];
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((v) => {
            const opt = (field.options ?? []).find((o) => o.value === v);
            return (
              <Badge key={v} variant="secondary">
                {opt?.label ?? v}
              </Badge>
            );
          })}
        </div>
      );
    }
    case "severity":
      return <SeverityBadge severity={String(value).toUpperCase() as Severity} />;
    case "textarea":
      return (
        <span className="whitespace-pre-wrap break-words">{String(value)}</span>
      );
    case "number":
      return <span className="font-mono">{String(value)}</span>;
    case "rating": {
      const n = Number(value);
      return (
        <span className="inline-flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i <= n ? "fill-warning text-warning" : "text-muted-foreground/40",
              )}
            />
          ))}
        </span>
      );
    }
    case "email":
      return (
        <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${String(value)}`}>
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          {String(value)}
        </a>
      );
    case "phone":
      return (
        <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${String(value)}`}>
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          {String(value)}
        </a>
      );
    case "url":
      return (
        <a
          className="inline-flex items-center gap-1 hover:underline"
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{String(value)}</span>
        </a>
      );
    case "photo": {
      const v = value as UploadedAsset;
      if (!v?.url) return <span className="text-muted-foreground">—</span>;
      return (
        <a href={v.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={v.url}
            alt={v.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        </a>
      );
    }
    case "file": {
      const v = value as UploadedAsset;
      if (!v?.url) return <span className="text-muted-foreground">—</span>;
      return (
        <a
          className="inline-flex items-center gap-1 hover:underline"
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{v.name}</span>
        </a>
      );
    }
    case "repeatable":
    case "table":
      return (
        <RepeatableValueCell
          subFields={field.subFields ?? []}
          rows={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
        />
      );
    default:
      return <span>{String(value)}</span>;
  }
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge variant={SEVERITY_BADGE_VARIANT[severity]} className="uppercase">
      {severity}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add Finding composer (renders the dynamic form)                           */
/* -------------------------------------------------------------------------- */

type ComposerProps =
  | {
      mode: "create";
      orgSlug: string;
      organizationId: string;
      inspectionId: string;
      selectionId: string;
      itemLabel: string;
      fields: FieldDef[];
      onAdded: (row: FindingRow) => void;
      onCancel: () => void;
    }
  | {
      mode: "edit";
      findingId: string;
      initialValues: Record<string, unknown>;
      initialSeverity: Severity;
      orgSlug: string;
      organizationId: string;
      inspectionId: string;
      selectionId: string;
      itemLabel: string;
      fields: FieldDef[];
      onUpdated: (row: FindingRow) => void;
      onCancel: () => void;
    };

function FindingComposer(props: ComposerProps) {
  const {
    mode,
    orgSlug,
    organizationId,
    inspectionId,
    selectionId,
    itemLabel,
    fields,
    onCancel,
  } = props;
  const t = useT();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>(
    mode === "edit" ? { ...props.initialValues } : {},
  );

  function setValue(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (fields.length === 0) {
      toast.error(t("modules.inspections.noFieldsConfigured"));
      return;
    }

    const severityField = fields.find((f) => f.type === "severity");
    const fallbackSeverity: Severity =
      mode === "edit" ? props.initialSeverity : "LOW";
    const severity: Severity = severityField
      ? ((String(values[severityField.key] ?? fallbackSeverity).toUpperCase()) as Severity)
      : fallbackSeverity;

    start(async () => {
      try {
        if (mode === "create") {
          await addFinding(orgSlug, {
            inspectionId,
            itemSelectionId: selectionId,
            severity,
            values,
          });
          const optimisticDescription =
            findFirstTextValue(fields, values) || `${itemLabel} finding`;
          props.onAdded({
            id: `tmp_${Date.now()}`,
            description: optimisticDescription,
            severity,
            values,
            createdAt: new Date().toISOString(),
          });
          toast.success(t("modules.inspections.findingAdded"));
          setValues({});
        } else {
          await updateFinding(orgSlug, props.findingId, {
            severity,
            values,
          });
          const optimisticDescription =
            findFirstTextValue(fields, values) || `${itemLabel} finding`;
          props.onUpdated({
            id: props.findingId,
            description: optimisticDescription,
            severity,
            values,
            createdAt: new Date().toISOString(),
          });
          toast.success(t("modules.inspections.findingUpdated"));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
        <p>{t("modules.inspections.noFieldsConfigured")}</p>
        <div className="mt-3 flex justify-center">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border bg-muted/20 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <DynamicField
            key={f.id}
            field={f}
            organizationId={organizationId}
            value={values[f.key]}
            onChange={(v) => setValue(f.key, v)}
            wide={
              f.type === "textarea" ||
              f.type === "photo" ||
              f.type === "file" ||
              f.type === "multiselect" ||
              f.type === "multicheck" ||
              f.type === "radio" ||
              f.type === "repeatable" ||
              f.type === "table"
            }
          />
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "edit" ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {mode === "edit"
            ? t("common.save")
            : t("modules.inspections.saveFinding")}
        </Button>
      </div>
    </form>
  );
}

function DynamicField({
  field,
  organizationId,
  value,
  onChange,
  wide,
  compact,
}: {
  field: FieldDef;
  organizationId: string;
  value: unknown;
  onChange: (v: unknown) => void;
  wide?: boolean;
  /**
   * Compact mode for use inside table cells: no label, no help text,
   * no column-span wrapper. The column header serves as the label.
   */
  compact?: boolean;
}) {
  const id = `fld-${field.id}`;
  const wrapper = compact
    ? "min-w-[120px]"
    : wide
      ? "space-y-1 sm:col-span-2"
      : "space-y-1";
  const labelEl = compact ? null : (
    <Label htmlFor={id} className="text-xs">
      {field.label}
      {field.required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
  );
  const helpEl = !compact && field.helpText ? (
    <p className="text-xs text-muted-foreground">{field.helpText}</p>
  ) : null;

  switch (field.type) {
    case "textarea":
      return (
        <div className={wrapper}>
          {labelEl}
          <Textarea
            id={id}
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "number":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) =>
              onChange(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder={field.placeholder ?? ""}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "rating":
      return (
        <div className={wrapper}>
          {labelEl}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => {
              const active = Number(value) >= i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(value === i ? 0 : i)}
                  aria-label={`${i} stars`}
                  className="rounded p-0.5 transition hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      active
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
          </div>
          {helpEl}
        </div>
      );
    case "email":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? "name@example.com"}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "phone":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? "+1 555 0100"}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "url":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="url"
            inputMode="url"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? "https://"}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "date":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "datetime":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "time":
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            type="time"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "checkbox":
      return (
        <div className={wrapper}>
          {!compact && (
            <Label htmlFor={id} className="text-xs">
              {field.label}
            </Label>
          )}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border border-input bg-background text-sm",
              compact ? "h-9 px-2" : "h-11 px-3",
            )}
          >
            <input
              id={id}
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {field.placeholder ?? ""}
          </label>
          {helpEl}
        </div>
      );
    case "select":
      return (
        <div className={wrapper}>
          {labelEl}
          <Combobox
            options={field.options ?? []}
            value={(value as string) ?? null}
            onChange={(v) => onChange(v)}
            placeholder={field.placeholder ?? ""}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "multiselect":
      return (
        <div className={wrapper}>
          {labelEl}
          <Combobox
            multiple
            options={field.options ?? []}
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(v) => onChange(v)}
            placeholder={field.placeholder ?? ""}
          />
          {helpEl}
        </div>
      );
    case "radio":
      return (
        <div className={wrapper}>
          {labelEl}
          <div className="flex flex-wrap gap-2 pt-1">
            {(field.options ?? []).map((o) => {
              const checked = String(value) === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent",
                  )}
                >
                  <input
                    type="radio"
                    name={`fld-${field.id}-radio`}
                    checked={checked}
                    onChange={() => onChange(o.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {helpEl}
        </div>
      );
    case "multicheck": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className={wrapper}>
          {labelEl}
          <div className="flex flex-wrap gap-2 pt-1">
            {(field.options ?? []).map((o) => {
              const checked = arr.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition",
                    checked
                      ? "border-primary bg-primary/5"
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
                      onChange(next);
                    }}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {helpEl}
        </div>
      );
    }
    case "severity":
      return (
        <div className={wrapper}>
          {labelEl}
          <Select
            value={((value as string) ?? "LOW").toUpperCase()}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helpEl}
        </div>
      );
    case "photo":
      return (
        <div className={wrapper}>
          {labelEl}
          <UploadField
            organizationId={organizationId}
            folder="findings/photos"
            imageOnly
            capture
            value={(value as UploadedAsset | null) ?? null}
            onChange={(v) => onChange(v)}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "file":
      return (
        <div className={wrapper}>
          {labelEl}
          <UploadField
            organizationId={organizationId}
            folder="findings/files"
            value={(value as UploadedAsset | null) ?? null}
            onChange={(v) => onChange(v)}
            required={field.required}
          />
          {helpEl}
        </div>
      );
    case "repeatable":
      return (
        <div className={wrapper}>
          {labelEl}
          <RepeatableField
            field={field}
            organizationId={organizationId}
            value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
            onChange={(rows) => onChange(rows)}
          />
          {helpEl}
        </div>
      );
    case "table":
      return (
        <div className={wrapper}>
          {labelEl}
          <TableField
            field={field}
            organizationId={organizationId}
            value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
            onChange={(rows) => onChange(rows)}
          />
          {helpEl}
        </div>
      );
    default:
      return (
        <div className={wrapper}>
          {labelEl}
          <Input
            id={id}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            required={field.required}
          />
          {helpEl}
        </div>
      );
  }
}

function findFirstTextValue(
  fields: FieldDef[],
  values: Record<string, unknown>,
): string | null {
  const TEXT_LIKE = new Set(["text", "textarea", "email", "phone", "url"]);
  for (const f of fields) {
    if (TEXT_LIKE.has(f.type)) {
      const v = values[f.key];
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Repeatable group: array of rows, each containing the parent's sub-fields. */
/* -------------------------------------------------------------------------- */

function RepeatableField({
  field,
  organizationId,
  value,
  onChange,
}: {
  field: FieldDef;
  organizationId: string;
  value: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const t = useT();
  const subs = field.subFields ?? [];
  const presets = field.presetRows ?? [];
  const presetCount = presets.length;

  React.useEffect(() => {
    if (presetCount === 0) return;
    const cur = value ?? [];
    let changed = cur.length < presetCount;
    const next: Record<string, unknown>[] = [];
    for (let i = 0; i < presetCount; i++) {
      const existing = (cur[i] ?? {}) as Record<string, unknown>;
      const preset = presets[i] ?? {};
      const merged: Record<string, unknown> = { ...existing };
      for (const [k, v] of Object.entries(preset)) {
        if (existing[k] !== v) {
          merged[k] = v;
          changed = true;
        }
      }
      next.push(merged);
    }
    for (let i = presetCount; i < cur.length; i++) {
      next.push(cur[i] ?? {});
    }
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetCount, JSON.stringify(presets), value, onChange]);

  function addRow() {
    onChange([...(value ?? []), {}]);
  }

  function removeRow(idx: number) {
    if (idx < presetCount) return;
    onChange((value ?? []).filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, key: string, v: unknown) {
    if (idx < presetCount && presets[idx]?.[key] !== undefined) return;
    const next = [...(value ?? [])];
    next[idx] = { ...(next[idx] ?? {}), [key]: v };
    onChange(next);
  }

  if (subs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
        {t("modules.inspectionItems.subFieldsRequired")}
      </p>
    );
  }

  const baseRows = value ?? [];
  const rowCount = Math.max(baseRows.length, presetCount);
  const displayRows: Record<string, unknown>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const base = (baseRows[i] ?? {}) as Record<string, unknown>;
    const preset = presets[i] ?? {};
    displayRows.push({ ...base, ...preset });
  }

  return (
    <div className="space-y-2">
      {displayRows.length === 0 && (
        <p className="rounded-xl border border-dashed bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
          {t("modules.inspections.repeatableEmpty")}
        </p>
      )}
      {displayRows.map((row, idx) => {
        const isPreset = idx < presetCount;
        return (
          <div
            key={idx}
            className={cn(
              "space-y-2 rounded-xl border p-3",
              isPreset ? "bg-muted/20" : "bg-background/60",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("modules.inspections.row")} #{idx + 1}
                {isPreset && (
                  <Lock className="h-3 w-3 text-muted-foreground/60" />
                )}
              </p>
              {!isPreset ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(idx)}
                  title={t("common.remove")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {subs.map((sf) => {
                const presetVal = isPreset ? presets[idx]?.[sf.key] : undefined;
                const cellLocked = presetVal !== undefined;
                const wide =
                  sf.type === "textarea" ||
                  sf.type === "photo" ||
                  sf.type === "file" ||
                  sf.type === "multiselect" ||
                  sf.type === "multicheck" ||
                  sf.type === "radio";
                if (cellLocked) {
                  return (
                    <div
                      key={sf.key}
                      className={cn(
                        "space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm",
                        wide && "sm:col-span-2",
                      )}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {sf.label}
                      </p>
                      <p className="whitespace-pre-wrap break-words font-medium">
                        {formatPresetDisplay(sf, presetVal)}
                      </p>
                    </div>
                  );
                }
                const synthetic: FieldDef = {
                  id: `${field.id}-r${idx}-${sf.key}`,
                  key: sf.key,
                  label: sf.label,
                  type: sf.type,
                  required: sf.required,
                  options: sf.options,
                  placeholder: sf.placeholder,
                  helpText: sf.helpText,
                  subFields: null,
                  presetRows: null,
                };
                return (
                  <DynamicField
                    key={sf.key}
                    field={synthetic}
                    organizationId={organizationId}
                    value={row?.[sf.key]}
                    onChange={(v) => updateRow(idx, sf.key, v)}
                    wide={wide}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex justify-start">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          {t("modules.inspections.addRow")}
        </Button>
      </div>
    </div>
  );
}

function RepeatableValueCell({
  subFields,
  rows,
}: {
  subFields: SubFieldDef[];
  rows: Record<string, unknown>[];
}) {
  const t = useT();
  if (!rows || rows.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (subFields.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        {rows.length}
      </span>
    );
  }
  return (
    <div>
      {/* Mobile: stacked rows */}
      <div className="space-y-1.5 md:hidden">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-md border bg-muted/10 p-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              #{idx + 1}
            </div>
            <dl className="space-y-1">
              {subFields.map((sf) => {
                const synthetic: FieldDef = {
                  id: `repeat-${idx}-${sf.key}`,
                  key: sf.key,
                  label: sf.label,
                  type: sf.type,
                  required: sf.required,
                  options: sf.options,
                  placeholder: sf.placeholder,
                  helpText: sf.helpText,
                  subFields: null,
                  presetRows: null,
                };
                return (
                  <div
                    key={sf.key}
                    className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-baseline sm:gap-2"
                  >
                    <dt className="m-0 shrink-0 font-medium text-muted-foreground sm:w-24">
                      {sf.label}
                    </dt>
                    <dd className="m-0 min-w-0 break-words">
                      <ValueCell field={synthetic} value={row?.[sf.key]} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">
          {rows.length} {rows.length === 1 ? t("modules.inspections.row") : t("modules.inspections.rows")}
        </p>
      </div>

      {/* Tablet/desktop: compact grid */}
      <div className="hidden overflow-auto md:block">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="rounded-tl-md bg-muted/40 px-2 py-1 text-left font-medium text-muted-foreground">
                #
              </th>
              {subFields.map((sf, i) => (
                <th
                  key={sf.key}
                  className={cn(
                    "bg-muted/40 px-2 py-1 text-left font-medium text-muted-foreground",
                    i === subFields.length - 1 && "rounded-tr-md",
                  )}
                >
                  {sf.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="align-top">
                <td className="border-t px-2 py-1 text-muted-foreground">
                  {idx + 1}
                </td>
                {subFields.map((sf) => {
                  const synthetic: FieldDef = {
                    id: `repeat-${idx}-${sf.key}`,
                    key: sf.key,
                    label: sf.label,
                    type: sf.type,
                    required: sf.required,
                    options: sf.options,
                    placeholder: sf.placeholder,
                    helpText: sf.helpText,
                    subFields: null,
                    presetRows: null,
                  };
                  return (
                    <td key={sf.key} className="border-t px-2 py-1">
                      <ValueCell field={synthetic} value={row?.[sf.key]} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {rows.length} {rows.length === 1 ? t("modules.inspections.row") : t("modules.inspections.rows")}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table field: spreadsheet-style grid input.                                */
/*  Sub-fields are columns; inspector adds rows. Same data shape as repeatable. */
/* -------------------------------------------------------------------------- */

function TableField({
  field,
  organizationId,
  value,
  onChange,
}: {
  field: FieldDef;
  organizationId: string;
  value: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const t = useT();
  const subs = field.subFields ?? [];
  const presets = field.presetRows ?? [];
  const presetCount = presets.length;

  // Seed preset rows into the bound value so the saved finding always carries
  // the locked-column values. Re-runs harmlessly until merged values stabilise.
  React.useEffect(() => {
    if (presetCount === 0) return;
    const cur = value ?? [];
    let changed = cur.length < presetCount;
    const next: Record<string, unknown>[] = [];
    for (let i = 0; i < presetCount; i++) {
      const existing = (cur[i] ?? {}) as Record<string, unknown>;
      const preset = presets[i] ?? {};
      const merged: Record<string, unknown> = { ...existing };
      for (const [k, v] of Object.entries(preset)) {
        if (existing[k] !== v) {
          merged[k] = v;
          changed = true;
        }
      }
      next.push(merged);
    }
    for (let i = presetCount; i < cur.length; i++) {
      next.push(cur[i] ?? {});
    }
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetCount, JSON.stringify(presets), value, onChange]);

  function addRow() {
    onChange([...(value ?? []), {}]);
  }

  function removeRow(idx: number) {
    if (idx < presetCount) return; // preset rows are locked
    onChange((value ?? []).filter((_, i) => i !== idx));
  }

  function updateCell(idx: number, key: string, v: unknown) {
    if (idx < presetCount && presets[idx]?.[key] !== undefined) return; // locked cell
    const next = [...(value ?? [])];
    next[idx] = { ...(next[idx] ?? {}), [key]: v };
    onChange(next);
  }

  if (subs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
        {t("modules.inspectionItems.tableColumnsRequired")}
      </p>
    );
  }

  // Display rows: the larger of bound value and preset count, with preset
  // values projected onto locked cells in case the seed effect hasn't run yet.
  const baseRows = value ?? [];
  const rowCount = Math.max(baseRows.length, presetCount);
  const displayRows: Record<string, unknown>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const base = (baseRows[i] ?? {}) as Record<string, unknown>;
    const preset = presets[i] ?? {};
    displayRows.push({ ...base, ...preset });
  }

  function renderCellInput(
    sf: SubFieldDef,
    idx: number,
    row: Record<string, unknown>,
  ) {
    const synthetic: FieldDef = {
      id: `${field.id}-tr${idx}-${sf.key}`,
      key: sf.key,
      label: sf.label,
      type: sf.type,
      required: sf.required,
      options: sf.options,
      placeholder: sf.placeholder,
      helpText: sf.helpText,
      subFields: null,
      presetRows: null,
    };
    return (
      <DynamicField
        field={synthetic}
        organizationId={organizationId}
        value={row?.[sf.key]}
        onChange={(v) => updateCell(idx, sf.key, v)}
        compact
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Mobile: stacked cards (one card per row) */}
      <div className="space-y-2 md:hidden">
        {displayRows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
            {t("modules.inspections.tableEmpty")}
          </div>
        ) : (
          displayRows.map((row, idx) => {
            const isPreset = idx < presetCount;
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-xl border bg-background p-3",
                  isPreset && "bg-muted/20",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  {!isPreset ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      className="h-8 px-2"
                      title={t("common.remove")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70"
                      title={t("modules.inspections.presetRowLocked")}
                    >
                      <Lock className="h-3 w-3" />
                      {t("modules.inspections.presetRowLocked")}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {subs.map((sf) => {
                    const presetVal = isPreset ? presets[idx]?.[sf.key] : undefined;
                    const cellLocked = presetVal !== undefined;
                    return (
                      <div key={sf.key} className="space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          <span>{sf.label}</span>
                          {sf.required && (
                            <span className="text-destructive">*</span>
                          )}
                          {cellLocked && (
                            <Lock className="ml-0.5 h-3 w-3 text-muted-foreground/60" />
                          )}
                        </div>
                        {cellLocked ? (
                          <p className="whitespace-pre-wrap break-words text-sm font-medium">
                            {formatPresetDisplay(sf, presetVal) || "—"}
                          </p>
                        ) : (
                          renderCellInput(sf, idx, row)
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tablet/desktop: spreadsheet grid */}
      <div className="hidden overflow-auto rounded-xl border bg-background md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 px-2 py-2 font-medium">#</th>
              {subs.map((sf) => (
                <th key={sf.key} className="px-2 py-2 font-medium">
                  {sf.label}
                  {sf.required && <span className="ml-0.5 text-destructive">*</span>}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={subs.length + 2}
                  className="px-3 py-4 text-center text-xs text-muted-foreground"
                >
                  {t("modules.inspections.tableEmpty")}
                </td>
              </tr>
            ) : (
              displayRows.map((row, idx) => {
                const isPreset = idx < presetCount;
                return (
                  <tr
                    key={idx}
                    className={cn("align-top", isPreset && "bg-muted/20")}
                  >
                    <td className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    {subs.map((sf) => {
                      const presetVal = isPreset ? presets[idx]?.[sf.key] : undefined;
                      const cellLocked = presetVal !== undefined;
                      if (cellLocked) {
                        return (
                          <td
                            key={sf.key}
                            className="border-t px-2 py-1.5 align-top text-sm"
                          >
                            <span className="block whitespace-pre-wrap break-words font-medium">
                              {formatPresetDisplay(sf, presetVal)}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={sf.key}
                          className="border-t px-2 py-1.5 align-top"
                        >
                          {renderCellInput(sf, idx, row)}
                        </td>
                      );
                    })}
                    <td className="border-t px-2 py-1.5 text-right">
                      {!isPreset ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(idx)}
                          title={t("common.remove")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center"
                          title={t("modules.inspections.presetRowLocked")}
                        >
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-start">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          {t("modules.inspections.addRow")}
        </Button>
      </div>
    </div>
  );
}

/** Render a preset value as plain text, mapping select options to labels. */
function formatPresetDisplay(sub: SubFieldDef, val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  if (sub.type === "select" || sub.type === "radio") {
    const opt = (sub.options ?? []).find((o) => o.value === val);
    return opt?.label ?? String(val);
  }
  if (sub.type === "multiselect" || sub.type === "multicheck") {
    const arr = Array.isArray(val) ? (val as string[]) : [];
    return arr
      .map((v) => (sub.options ?? []).find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  if (sub.type === "checkbox") return val === true ? "✓" : "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
