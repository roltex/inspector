"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireMembership, requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  inspection,
  finding,
  company,
  companyObject,
  inspectionItem,
  inspectionItemField,
  inspectionItemSelection,
  member,
} from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import {
  inspectionCreateSchema,
  inspectionUpdateSchema,
  findingCreateSchema,
  findingUpdateSchema,
} from "@/lib/validators/inspections";

type FindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Validates a structured `values` payload against the form-builder schema for
 * a given checklist row. Returns the cleaned values, a synthesized description
 * (when none was provided), and a hoisted severity (when the form contains a
 * `severity` field).
 */
/**
 * Validate one leaf-level value (text, number, select, photo, etc.) against a
 * field definition. Throws on bad input, otherwise returns the cleaned value.
 * Used both for top-level fields and for sub-fields inside a `repeatable` row.
 */
function validateLeafValue(
  f: {
    key: string;
    label: string;
    type: string;
    options?: Array<{ value: string; label: string }> | null;
  },
  raw: unknown,
): { value: unknown; severity?: FindingSeverity } {
  switch (f.type) {
    case "number":
    case "rating": {
      const n = typeof raw === "number" ? raw : Number(String(raw));
      if (Number.isNaN(n)) throw new Error(`"${f.label}" must be a number`);
      if (f.type === "rating" && (n < 1 || n > 5)) {
        throw new Error(`"${f.label}" must be between 1 and 5`);
      }
      return { value: n };
    }
    case "checkbox":
      return {
        value:
          raw === true || raw === "true" || raw === "on" || raw === 1 || raw === "1",
      };
    case "date":
    case "datetime": {
      const s = String(raw);
      if (Number.isNaN(new Date(s).getTime())) {
        throw new Error(`"${f.label}" must be a valid date`);
      }
      return { value: s };
    }
    case "time": {
      const s = String(raw);
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) {
        throw new Error(`"${f.label}" must be HH:MM`);
      }
      return { value: s };
    }
    case "email": {
      const s = String(raw).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        throw new Error(`"${f.label}" must be a valid email`);
      }
      return { value: s };
    }
    case "url": {
      const s = String(raw).trim();
      try {
        new URL(s);
      } catch {
        throw new Error(`"${f.label}" must be a valid URL`);
      }
      return { value: s };
    }
    case "phone": {
      const s = String(raw).trim();
      if (!/^[+0-9 ()\-.]{4,30}$/.test(s)) {
        throw new Error(`"${f.label}" must be a valid phone number`);
      }
      return { value: s };
    }
    case "select":
    case "radio": {
      const allowed = (f.options ?? []).map((o) => o.value);
      const v = String(raw);
      if (allowed.length > 0 && !allowed.includes(v)) {
        throw new Error(`"${f.label}" has an invalid option`);
      }
      return { value: v };
    }
    case "multiselect":
    case "multicheck": {
      const allowed = new Set((f.options ?? []).map((o) => o.value));
      const arr = Array.isArray(raw) ? raw : [raw];
      const cleanedArr = arr.map((x) => String(x));
      if (allowed.size > 0) {
        for (const v of cleanedArr) {
          if (!allowed.has(v)) {
            throw new Error(`"${f.label}" has an invalid option`);
          }
        }
      }
      return { value: cleanedArr };
    }
    case "severity": {
      const v = String(raw).toUpperCase();
      if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(v)) {
        throw new Error(`"${f.label}" must be Low, Medium, High or Critical`);
      }
      return { value: v, severity: v as FindingSeverity };
    }
    case "photo":
    case "file": {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error(`"${f.label}" must be an uploaded file`);
      }
      const obj = raw as Record<string, unknown>;
      if (typeof obj.url !== "string" || typeof obj.key !== "string") {
        throw new Error(`"${f.label}" upload payload is invalid`);
      }
      return {
        value: {
          url: obj.url,
          key: obj.key,
          name: typeof obj.name === "string" ? obj.name : "file",
          size: typeof obj.size === "number" ? obj.size : 0,
          mime:
            typeof obj.mime === "string" ? obj.mime : "application/octet-stream",
        },
      };
    }
    default:
      return { value: String(raw) };
  }
}

function isPresent(raw: unknown): boolean {
  const isArr = Array.isArray(raw);
  return (
    raw !== undefined &&
    raw !== null &&
    !(typeof raw === "string" && raw.trim() === "") &&
    !(isArr && raw.length === 0) &&
    !(typeof raw === "object" && !isArr && Object.keys(raw as object).length === 0)
  );
}

async function validateFindingValues(opts: {
  organizationId: string;
  itemSelectionId: string;
  inspectionId: string;
  values: Record<string, unknown>;
  description?: string;
  severity: FindingSeverity;
}): Promise<{
  cleaned: Record<string, unknown> | null;
  description: string;
  severity: FindingSeverity;
}> {
  const [sel] = await db
    .select({
      id: inspectionItemSelection.id,
      itemId: inspectionItemSelection.itemId,
      label: inspectionItemSelection.label,
    })
    .from(inspectionItemSelection)
    .where(
      and(
        eq(inspectionItemSelection.id, opts.itemSelectionId),
        eq(inspectionItemSelection.inspectionId, opts.inspectionId),
        eq(inspectionItemSelection.organizationId, opts.organizationId),
      ),
    )
    .limit(1);
  if (!sel) throw new Error("Checklist row not found on this inspection");

  let cleaned: Record<string, unknown> | null = null;
  let description = (opts.description ?? "").trim();
  let severity = opts.severity;

  if (sel.itemId) {
    const fields = await db
      .select()
      .from(inspectionItemField)
      .where(
        and(
          eq(inspectionItemField.organizationId, opts.organizationId),
          eq(inspectionItemField.inspectionItemId, sel.itemId),
        ),
      )
      .orderBy(inspectionItemField.sortOrder);

    const incoming = opts.values;
    const out: Record<string, unknown> = {};

    for (const f of fields) {
      const raw = incoming[f.key];
      const present = isPresent(raw);
      if (f.required && !present) {
        throw new Error(`"${f.label}" is required`);
      }
      if (!present) continue;

      if (f.type === "repeatable" || f.type === "table") {
        const subDefs = (f.subFields ?? []) as Array<{
          key: string;
          label: string;
          type: string;
          options?: Array<{ value: string; label: string }> | null;
          required?: boolean;
        }>;
        if (!Array.isArray(raw)) {
          throw new Error(`"${f.label}" must be a list`);
        }
        const cleanedRows: Record<string, unknown>[] = [];
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          if (typeof row !== "object" || row === null || Array.isArray(row)) {
            throw new Error(`"${f.label}" row ${i + 1} is invalid`);
          }
          const rowIn = row as Record<string, unknown>;
          // Skip totally-empty rows so trailing blanks don't fail validation.
          const hasAny = subDefs.some((sf) => isPresent(rowIn[sf.key]));
          if (!hasAny) continue;
          const cleanedRow: Record<string, unknown> = {};
          for (const sf of subDefs) {
            const sraw = rowIn[sf.key];
            const sPresent = isPresent(sraw);
            if (sf.required && !sPresent) {
              throw new Error(
                `"${f.label}" row ${i + 1}: "${sf.label}" is required`,
              );
            }
            if (!sPresent) continue;
            try {
              const r = validateLeafValue(sf, sraw);
              cleanedRow[sf.key] = r.value;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              throw new Error(`"${f.label}" row ${i + 1}: ${msg}`);
            }
          }
          cleanedRows.push(cleanedRow);
        }
        if (f.required && cleanedRows.length === 0) {
          throw new Error(`"${f.label}" needs at least one row`);
        }
        out[f.key] = cleanedRows;
        continue;
      }

      const r = validateLeafValue(f, raw);
      if (r.severity) severity = r.severity;
      out[f.key] = r.value;
    }
    cleaned = out;

    if (!description) {
      const TEXT_LIKE = new Set(["text", "textarea", "email", "phone", "url"]);
      const firstText = fields
        .filter((f) => TEXT_LIKE.has(f.type))
        .map((f) => out[f.key])
        .find((v) => typeof v === "string" && (v as string).trim().length > 0);
      description = (firstText as string) || `${sel.label} finding`;
    }
  }

  return { cleaned, description, severity };
}

export async function createInspection(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "inspections:create");
  const data = inspectionCreateSchema.parse(input);

  // INSPECTOR-role users can only assign inspections to themselves —
  // ignore any other value the client may have submitted.
  if (m.role === "INSPECTOR") {
    data.assigneeId = m.user.id;
  }

  // Validate that the company/object/inspector belong to this org.
  let companyName: string | null = null;
  let objectName: string | null = null;
  if (data.companyId) {
    const [c] = await db
      .select({ id: company.id, name: company.name })
      .from(company)
      .where(and(eq(company.id, data.companyId), eq(company.organizationId, m.organization.id)))
      .limit(1);
    if (!c) throw new Error("Company not found in workspace");
    companyName = c.name;
  }
  if (data.objectId) {
    const [o] = await db
      .select({
        id: companyObject.id,
        companyId: companyObject.companyId,
        name: companyObject.name,
      })
      .from(companyObject)
      .where(
        and(
          eq(companyObject.id, data.objectId),
          eq(companyObject.organizationId, m.organization.id),
        ),
      )
      .limit(1);
    if (!o) throw new Error("Object not found in workspace");
    if (data.companyId && o.companyId !== data.companyId) {
      throw new Error("Selected object does not belong to the selected company");
    }
    objectName = o.name;
  }
  // The "inspector" is whichever workspace member is assigned to perform the
  // inspection. Validate that the assignee is a member of this organization.
  if (data.assigneeId) {
    const [mem] = await db
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(
          eq(member.userId, data.assigneeId),
          eq(member.organizationId, m.organization.id),
        ),
      )
      .limit(1);
    if (!mem) throw new Error("Assignee is not a member of this workspace");
  }

  // Auto-generate a sensible title when none was supplied. Falls back to a
  // simple "Inspection" so the NOT-NULL constraint is always satisfied.
  const title =
    (data.title && data.title.trim()) ||
    [objectName, companyName].filter(Boolean).join(" · ") ||
    "Inspection";

  const id = createId("ins");
  await db.insert(inspection).values({
    id,
    organizationId: m.organization.id,
    title,
    templateId: data.templateId ?? null,
    siteId: data.siteId ?? null,
    companyId: data.companyId ?? null,
    objectId: data.objectId ?? null,
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
    assigneeId: data.assigneeId ?? null,
    notes: data.notes ?? null,
    createdById: m.user.id,
    status: data.scheduledFor ? "SCHEDULED" : "DRAFT",
  });

  // Snapshot selected items into the per-inspection checklist.
  if (data.itemIds && data.itemIds.length > 0) {
    const items = await db
      .select()
      .from(inspectionItem)
      .where(
        and(
          eq(inspectionItem.organizationId, m.organization.id),
          inArray(inspectionItem.id, data.itemIds),
        ),
      );
    if (items.length > 0) {
      // Preserve the sortOrder coming from the catalog; tie-break by name.
      items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      await db.insert(inspectionItemSelection).values(
        items.map((it, idx) => ({
          id: createId("isl"),
          organizationId: m.organization.id,
          inspectionId: id,
          itemId: it.id,
          label: it.name,
          category: it.category,
          checked: false,
          sortOrder: idx,
        })),
      );
    }
  }

  revalidatePath(`/${orgSlug}/inspections`);
  redirect(`/${orgSlug}/inspections/${id}`);
}

export async function updateInspection(orgSlug: string, id: string, input: unknown) {
  const m = await requirePermission(orgSlug, "inspections:edit");
  const data = inspectionUpdateSchema.parse(input);
  await db
    .update(inspection)
    .set({
      ...data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      completedAt: data.status === "COMPLETED" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(inspection.id, id), eq(inspection.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/inspections/${id}`);
  revalidatePath(`/${orgSlug}/inspections`);
}

export async function deleteInspection(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "inspections:delete");
  await db
    .delete(inspection)
    .where(and(eq(inspection.id, id), eq(inspection.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/inspections`);
  redirect(`/${orgSlug}/inspections`);
}

export async function addFinding(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = findingCreateSchema.parse(input);

  // INSPECTORs can only add findings to inspections that are assigned to them.
  const [insp] = await db
    .select({ id: inspection.id, assigneeId: inspection.assigneeId })
    .from(inspection)
    .where(
      and(
        eq(inspection.id, data.inspectionId),
        eq(inspection.organizationId, m.organization.id),
      ),
    )
    .limit(1);
  if (!insp) throw new Error("Inspection not found in this workspace");
  if (m.role === "INSPECTOR" && insp.assigneeId !== m.user.id) {
    throw new Error("Not assigned to this inspection");
  }

  let resolvedValues: Record<string, unknown> | null = null;
  let resolvedDescription = data.description?.trim() || "";
  let resolvedSeverity: FindingSeverity = data.severity;

  if (data.itemSelectionId) {
    const r = await validateFindingValues({
      organizationId: m.organization.id,
      itemSelectionId: data.itemSelectionId,
      inspectionId: data.inspectionId,
      values: (data.values ?? {}) as Record<string, unknown>,
      description: resolvedDescription,
      severity: resolvedSeverity,
    });
    resolvedValues = r.cleaned;
    resolvedDescription = r.description;
    resolvedSeverity = r.severity;
  }

  if (!resolvedDescription) {
    throw new Error("A description is required");
  }

  await db.insert(finding).values({
    id: createId("fnd"),
    organizationId: m.organization.id,
    inspectionId: data.inspectionId,
    itemSelectionId: data.itemSelectionId ?? null,
    description: resolvedDescription,
    severity: resolvedSeverity,
    questionKey: data.questionKey,
    values: resolvedValues,
  });
  revalidatePath(`/${orgSlug}/inspections/${data.inspectionId}`);
}

/** Update an existing finding's structured values (and any hoisted columns). */
export async function updateFinding(
  orgSlug: string,
  findingId: string,
  input: unknown,
) {
  const m = await requireMembership(orgSlug);
  const data = findingUpdateSchema.parse(input);

  const [existing] = await db
    .select({
      id: finding.id,
      inspectionId: finding.inspectionId,
      itemSelectionId: finding.itemSelectionId,
      severity: finding.severity,
      description: finding.description,
      assigneeId: inspection.assigneeId,
    })
    .from(finding)
    .leftJoin(inspection, eq(inspection.id, finding.inspectionId))
    .where(
      and(
        eq(finding.id, findingId),
        eq(finding.organizationId, m.organization.id),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Finding not found in this workspace");

  if (m.role === "INSPECTOR" && existing.assigneeId !== m.user.id) {
    throw new Error("Not assigned to this inspection");
  }

  let resolvedValues: Record<string, unknown> | null = null;
  let resolvedDescription = data.description?.trim() || existing.description;
  let resolvedSeverity: FindingSeverity =
    (data.severity ?? (existing.severity as FindingSeverity)) || "LOW";

  if (existing.itemSelectionId) {
    const r = await validateFindingValues({
      organizationId: m.organization.id,
      itemSelectionId: existing.itemSelectionId,
      inspectionId: existing.inspectionId,
      values: (data.values ?? {}) as Record<string, unknown>,
      description: data.description?.trim() || "",
      severity: resolvedSeverity,
    });
    resolvedValues = r.cleaned;
    resolvedDescription = r.description;
    resolvedSeverity = r.severity;
  }

  if (!resolvedDescription) {
    throw new Error("A description is required");
  }

  await db
    .update(finding)
    .set({
      description: resolvedDescription,
      severity: resolvedSeverity,
      values: resolvedValues,
    })
    .where(
      and(
        eq(finding.id, findingId),
        eq(finding.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspections/${existing.inspectionId}`);
}

export async function deleteFinding(orgSlug: string, findingId: string) {
  const m = await requireMembership(orgSlug);
  const [row] = await db
    .select({
      id: finding.id,
      inspectionId: finding.inspectionId,
      assigneeId: inspection.assigneeId,
    })
    .from(finding)
    .leftJoin(inspection, eq(inspection.id, finding.inspectionId))
    .where(
      and(
        eq(finding.id, findingId),
        eq(finding.organizationId, m.organization.id),
      ),
    )
    .limit(1);
  if (!row) return;
  if (m.role === "INSPECTOR" && row.assigneeId !== m.user.id) {
    throw new Error("Not assigned to this inspection");
  }
  await db
    .delete(finding)
    .where(
      and(eq(finding.id, findingId), eq(finding.organizationId, m.organization.id)),
    );
  revalidatePath(`/${orgSlug}/inspections/${row.inspectionId}`);
}

/** Toggle a checklist item's checked state on a specific inspection. */
export async function toggleInspectionItemSelection(
  orgSlug: string,
  inspectionId: string,
  selectionId: string,
  checked: boolean,
) {
  const m = await requirePermission(orgSlug, "inspections:edit");
  await db
    .update(inspectionItemSelection)
    .set({ checked, updatedAt: new Date() })
    .where(
      and(
        eq(inspectionItemSelection.id, selectionId),
        eq(inspectionItemSelection.organizationId, m.organization.id),
        eq(inspectionItemSelection.inspectionId, inspectionId),
      ),
    );
  revalidatePath(`/${orgSlug}/inspections/${inspectionId}`);
}
