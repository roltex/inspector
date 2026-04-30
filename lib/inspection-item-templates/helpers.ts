/**
 * Internal helpers for the inspection-item TEMPLATE feature.
 *
 * The two operations that both the workspace UI and the super-admin / org-
 * bootstrap flow rely on:
 *
 *   - `snapshotItemFields(orgId, itemId)`
 *       Reads every form field that belongs to a given inspection item and
 *       returns a JSON-safe array suitable for storing on `inspection_item_template.fields`.
 *
 *   - `cloneTemplateIntoOrg(opts)`
 *       Creates a new `inspection_item` (plus all of its `inspection_item_field`
 *       rows) inside a target organization from a template snapshot.
 *
 * Neither helper performs auth / RBAC — callers are expected to gate the
 * operation themselves (server actions for users, super-admin guard for
 * platform-wide flows, no auth at all when invoked from the org-create
 * lifecycle hook).
 */

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  inspectionItem,
  inspectionItemCategory,
  inspectionItemField,
  inspectionItemTemplate,
} from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import type { TemplateFieldSnapshot } from "@/lib/validators/inspection-item-templates";
import type { FieldType } from "@/lib/validators/inspection-item-fields";

/* -------------------------------------------------------------------------- */
/*  Snapshot from a live inspection item                                       */
/* -------------------------------------------------------------------------- */

export async function snapshotItemFields(
  orgId: string,
  itemId: string,
): Promise<TemplateFieldSnapshot[]> {
  const rows = await db
    .select()
    .from(inspectionItemField)
    .where(
      and(
        eq(inspectionItemField.organizationId, orgId),
        eq(inspectionItemField.inspectionItemId, itemId),
      ),
    )
    .orderBy(asc(inspectionItemField.sortOrder), asc(inspectionItemField.label));

  return rows.map((r, idx) => ({
    key: r.key,
    label: r.label,
    // DB column is plain text so we narrow it to the validator union here.
    // Any unknown values would have been rejected at write-time by the
    // create / update schemas — so this cast is safe in practice.
    type: r.type as FieldType,
    options: r.options ?? null,
    // Normalise sub-fields: the Zod sub-schema sets `required: false` as the
    // default, so the inferred type has a required boolean. The DB jsonb
    // shape leaves `required` optional, so we backfill here.
    subFields:
      r.subFields?.map((sf) => ({
        key: sf.key,
        label: sf.label,
        type: sf.type,
        options: sf.options ?? null,
        required: sf.required ?? false,
        placeholder: sf.placeholder ?? null,
        helpText: sf.helpText ?? null,
      })) ?? null,
    presetRows: r.presetRows ?? null,
    required: r.required,
    placeholder: r.placeholder,
    helpText: r.helpText,
    // Re-base the sortOrder to the actual order we read so importing the
    // template into a new workspace produces the same visible ordering even
    // if the source item used non-contiguous values.
    sortOrder: idx,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Clone a template into an organization's catalogue                         */
/* -------------------------------------------------------------------------- */

interface CloneOptions {
  /** Target organization (the receiving workspace). */
  organizationId: string;
  /** Template id to read fields + metadata from. */
  templateId: string;
  /** Optional name override (defaults to the template's own name). */
  nameOverride?: string;
  /** Created-by user (set on both the new item and its fields). */
  createdById?: string | null;
  /**
   * Optional explicit category id (already validated to belong to the org).
   * When omitted, the helper will find-or-create a category by `categoryName`
   * from the template (or fall back to the workspace default of "General").
   */
  categoryId?: string;
  /** Apply this isActive value to the freshly-created item. */
  isActive?: boolean;
}

export async function cloneTemplateIntoOrg({
  organizationId,
  templateId,
  nameOverride,
  createdById,
  categoryId,
  isActive,
}: CloneOptions): Promise<{ itemId: string }> {
  const [tpl] = await db
    .select()
    .from(inspectionItemTemplate)
    .where(eq(inspectionItemTemplate.id, templateId))
    .limit(1);
  if (!tpl) throw new Error("Template not found");

  // Resolve category: prefer the explicit id supplied by the caller, otherwise
  // find-or-create one in the target org from the template's category name.
  const categoryName = (tpl.categoryName?.trim() || "General").slice(0, 120);
  let resolvedCategoryId = categoryId ?? null;
  let resolvedCategoryName = categoryName;

  if (resolvedCategoryId) {
    const [existingCat] = await db
      .select({ id: inspectionItemCategory.id, name: inspectionItemCategory.name })
      .from(inspectionItemCategory)
      .where(
        and(
          eq(inspectionItemCategory.id, resolvedCategoryId),
          eq(inspectionItemCategory.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!existingCat) {
      throw new Error("Selected category does not belong to this workspace.");
    }
    resolvedCategoryName = existingCat.name;
  } else {
    const [byName] = await db
      .select({ id: inspectionItemCategory.id, name: inspectionItemCategory.name })
      .from(inspectionItemCategory)
      .where(
        and(
          eq(inspectionItemCategory.organizationId, organizationId),
          eq(inspectionItemCategory.name, resolvedCategoryName),
        ),
      )
      .limit(1);
    if (byName) {
      resolvedCategoryId = byName.id;
      resolvedCategoryName = byName.name;
    } else {
      const newId = createId("iic");
      await db.insert(inspectionItemCategory).values({
        id: newId,
        organizationId,
        name: resolvedCategoryName,
        sortOrder: 0,
        isActive: true,
        createdById: createdById ?? null,
      });
      resolvedCategoryId = newId;
    }
  }

  // Insert the new item.
  const itemId = createId("ii");
  await db.insert(inspectionItem).values({
    id: itemId,
    organizationId,
    name: (nameOverride?.trim() || tpl.name).slice(0, 160),
    description: tpl.description ?? null,
    categoryId: resolvedCategoryId,
    category: resolvedCategoryName,
    sortOrder: 0,
    isActive: isActive ?? true,
    createdById: createdById ?? null,
  });

  // Insert every snapshotted field. We rebuild the unique key set per item to
  // tolerate templates produced by older code paths that allowed duplicates.
  const fields = (tpl.fields ?? []) as TemplateFieldSnapshot[];
  const seenKeys = new Set<string>();
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (!f) continue;
    let key = f.key;
    if (seenKeys.has(key)) {
      // Append a numeric suffix until unique on this item — preserves the
      // intent of the template even if the snapshot is slightly malformed.
      let n = 2;
      while (seenKeys.has(`${f.key}_${n}`)) n++;
      key = `${f.key}_${n}`;
    }
    seenKeys.add(key);

    await db.insert(inspectionItemField).values({
      id: createId("iif"),
      organizationId,
      inspectionItemId: itemId,
      key,
      label: f.label,
      type: f.type,
      options: f.options ?? null,
      subFields: f.subFields ?? null,
      presetRows: f.presetRows ?? null,
      required: f.required ?? false,
      placeholder: f.placeholder ?? null,
      helpText: f.helpText ?? null,
      sortOrder: typeof f.sortOrder === "number" ? f.sortOrder : i,
      createdById: createdById ?? null,
    });
  }

  return { itemId };
}

/* -------------------------------------------------------------------------- */
/*  Org-bootstrap helper                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Clone every active GLOBAL template that has `autoSeed=true` into the
 * target organization. Used by the post-org-create lifecycle hook so newly
 * provisioned tenants get a sensible starting catalogue.
 */
export async function seedOrgFromAutoSeedTemplates(
  organizationId: string,
  createdById?: string | null,
): Promise<{ seeded: number }> {
  const templates = await db
    .select({ id: inspectionItemTemplate.id })
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.autoSeed, true),
        eq(inspectionItemTemplate.isActive, true),
      ),
    );

  // Filter out any non-global rows (autoSeed only makes sense globally).
  const globals: typeof templates = [];
  for (const t of templates) {
    const [row] = await db
      .select({ organizationId: inspectionItemTemplate.organizationId })
      .from(inspectionItemTemplate)
      .where(eq(inspectionItemTemplate.id, t.id))
      .limit(1);
    if (row && row.organizationId === null) globals.push(t);
  }

  let seeded = 0;
  for (const t of globals) {
    try {
      await cloneTemplateIntoOrg({
        organizationId,
        templateId: t.id,
        createdById: createdById ?? null,
      });
      seeded++;
    } catch (err) {
      // Don't let a single bad template block the whole seed flow.
      console.error(
        `[templates] auto-seed failed for template ${t.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { seeded };
}
