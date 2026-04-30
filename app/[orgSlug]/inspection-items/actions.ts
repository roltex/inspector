"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { requirePermission, requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  inspectionItem,
  inspectionItemCategory,
  inspectionItemField,
  inspectionItemTemplate,
} from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import {
  inspectionItemCreateSchema,
  inspectionItemUpdateSchema,
} from "@/lib/validators/inspection-items";
import {
  inspectionItemCategoryCreateSchema,
  inspectionItemCategoryUpdateSchema,
} from "@/lib/validators/inspection-item-categories";
import {
  inspectionItemFieldCreateSchema,
  inspectionItemFieldUpdateSchema,
} from "@/lib/validators/inspection-item-fields";
import {
  applyTemplateInputSchema,
  inspectionItemTemplateCreateSchema,
  inspectionItemTemplateUpdateSchema,
} from "@/lib/validators/inspection-item-templates";
import {
  cloneTemplateIntoOrg,
  snapshotItemFields,
} from "@/lib/inspection-item-templates/helpers";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Look up a category that belongs to the given org. Throws when the category
 * doesn't exist or is owned by a different workspace — protects against
 * tampered client payloads referencing other tenants.
 */
async function getOwnedCategory(orgId: string, categoryId: string) {
  const [row] = await db
    .select({
      id: inspectionItemCategory.id,
      name: inspectionItemCategory.name,
      isActive: inspectionItemCategory.isActive,
    })
    .from(inspectionItemCategory)
    .where(
      and(
        eq(inspectionItemCategory.id, categoryId),
        eq(inspectionItemCategory.organizationId, orgId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Category not found in this workspace");
  return row;
}

/* -------------------------------------------------------------------------- */
/*  Inspection Items                                                          */
/* -------------------------------------------------------------------------- */

export async function createInspectionItem(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemCreateSchema.parse(input);
  const cat = await getOwnedCategory(m.organization.id, data.categoryId);

  await db.insert(inspectionItem).values({
    id: createId("ii"),
    organizationId: m.organization.id,
    name: data.name,
    description: data.description ?? null,
    categoryId: cat.id,
    category: cat.name,
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function updateInspectionItem(
  orgSlug: string,
  id: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemUpdateSchema.parse(input);

  // Build a partial update; if categoryId changes, also re-snapshot the name.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.categoryId !== undefined) {
    const cat = await getOwnedCategory(m.organization.id, data.categoryId);
    patch.categoryId = cat.id;
    patch.category = cat.name;
  }

  await db
    .update(inspectionItem)
    .set(patch)
    .where(
      and(
        eq(inspectionItem.id, id),
        eq(inspectionItem.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function deleteInspectionItem(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  await db
    .delete(inspectionItem)
    .where(
      and(
        eq(inspectionItem.id, id),
        eq(inspectionItem.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items`);
}

/** Returns active items grouped by category for the planning form. */
export async function listActiveItemsByCategory(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  const rows = await db
    .select()
    .from(inspectionItem)
    .where(
      and(
        eq(inspectionItem.organizationId, m.organization.id),
        eq(inspectionItem.isActive, true),
      ),
    );
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = groups.get(r.category) ?? [];
    list.push(r);
    groups.set(r.category, list);
  }
  const sorted: { category: string; items: typeof rows }[] = [];
  for (const [category, items] of groups) {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    sorted.push({ category, items });
  }
  sorted.sort((a, b) => a.category.localeCompare(b.category));
  return sorted;
}

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

export async function createInspectionItemCategory(
  orgSlug: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemCategoryCreateSchema.parse(input);

  // Friendly error if a category with this name already exists in the org.
  const existing = await db
    .select({ id: inspectionItemCategory.id })
    .from(inspectionItemCategory)
    .where(
      and(
        eq(inspectionItemCategory.organizationId, m.organization.id),
        eq(inspectionItemCategory.name, data.name),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    throw new Error("A category with this name already exists.");
  }

  const id = createId("iic");
  await db.insert(inspectionItemCategory).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    description: data.description ?? null,
    color: data.color ?? null,
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/inspection-items`);
  return { id, name: data.name };
}

export async function updateInspectionItemCategory(
  orgSlug: string,
  id: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemCategoryUpdateSchema.parse(input);

  // Make sure the category belongs to this org first (and grab the old name).
  const before = await getOwnedCategory(m.organization.id, id);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.color !== undefined) patch.color = data.color ?? null;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  await db
    .update(inspectionItemCategory)
    .set(patch)
    .where(
      and(
        eq(inspectionItemCategory.id, id),
        eq(inspectionItemCategory.organizationId, m.organization.id),
      ),
    );

  // Renaming the category? Re-snapshot the name onto every linked item so
  // existing inspection-item rows (and their planning UI) stay consistent.
  if (data.name !== undefined && data.name !== before.name) {
    await db
      .update(inspectionItem)
      .set({ category: data.name, updatedAt: new Date() })
      .where(
        and(
          eq(inspectionItem.organizationId, m.organization.id),
          eq(inspectionItem.categoryId, id),
        ),
      );
  }

  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function deleteInspectionItemCategory(
  orgSlug: string,
  id: string,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  // Block deletion if any items still reference this category — owners
  // should reassign or remove items first to avoid orphans.
  const counts = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(inspectionItem)
    .where(
      and(
        eq(inspectionItem.organizationId, m.organization.id),
        eq(inspectionItem.categoryId, id),
      ),
    );
  const usedBy = Number(counts[0]?.c ?? 0);
  if (usedBy > 0) {
    throw new Error(
      "This category still has items assigned. Reassign or remove them first.",
    );
  }

  await db
    .delete(inspectionItemCategory)
    .where(
      and(
        eq(inspectionItemCategory.id, id),
        eq(inspectionItemCategory.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function listInspectionItemCategories(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  return db
    .select()
    .from(inspectionItemCategory)
    .where(eq(inspectionItemCategory.organizationId, m.organization.id))
    .orderBy(asc(inspectionItemCategory.sortOrder), asc(inspectionItemCategory.name));
}

/* -------------------------------------------------------------------------- */
/*  Form-builder fields per inspection item                                   */
/* -------------------------------------------------------------------------- */

/** Resolves an inspection item, scoped to the caller's org. */
async function getOwnedItem(orgId: string, itemId: string) {
  const [row] = await db
    .select({ id: inspectionItem.id, name: inspectionItem.name })
    .from(inspectionItem)
    .where(
      and(
        eq(inspectionItem.id, itemId),
        eq(inspectionItem.organizationId, orgId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Item not found in this workspace");
  return row;
}

export async function listInspectionItemFields(orgSlug: string, itemId: string) {
  const m = await requireMembership(orgSlug);
  await getOwnedItem(m.organization.id, itemId);
  return db
    .select()
    .from(inspectionItemField)
    .where(
      and(
        eq(inspectionItemField.organizationId, m.organization.id),
        eq(inspectionItemField.inspectionItemId, itemId),
      ),
    )
    .orderBy(asc(inspectionItemField.sortOrder), asc(inspectionItemField.label));
}

export async function createInspectionItemField(
  orgSlug: string,
  itemId: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  await getOwnedItem(m.organization.id, itemId);
  const data = inspectionItemFieldCreateSchema.parse(input);

  // Friendly error if the slug is already taken on this item.
  const [existing] = await db
    .select({ id: inspectionItemField.id })
    .from(inspectionItemField)
    .where(
      and(
        eq(inspectionItemField.inspectionItemId, itemId),
        eq(inspectionItemField.key, data.key),
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error("A field with this key already exists on this item.");
  }

  const id = createId("iif");
  await db.insert(inspectionItemField).values({
    id,
    organizationId: m.organization.id,
    inspectionItemId: itemId,
    key: data.key,
    label: data.label,
    type: data.type,
    options: data.options ?? null,
    subFields: data.subFields ?? null,
    presetRows: data.presetRows ?? null,
    required: data.required ?? false,
    placeholder: data.placeholder ?? null,
    helpText: data.helpText ?? null,
    sortOrder: data.sortOrder ?? 0,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/inspection-items`);
  return { id };
}

export async function updateInspectionItemField(
  orgSlug: string,
  fieldId: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemFieldUpdateSchema.parse(input);

  const [existing] = await db
    .select()
    .from(inspectionItemField)
    .where(
      and(
        eq(inspectionItemField.id, fieldId),
        eq(inspectionItemField.organizationId, m.organization.id),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Field not found in this workspace");

  // If renaming the slug, make sure it stays unique within the same item.
  if (data.key !== undefined && data.key !== existing.key) {
    const [clash] = await db
      .select({ id: inspectionItemField.id })
      .from(inspectionItemField)
      .where(
        and(
          eq(inspectionItemField.inspectionItemId, existing.inspectionItemId),
          eq(inspectionItemField.key, data.key),
        ),
      )
      .limit(1);
    if (clash) {
      throw new Error("A field with this key already exists on this item.");
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of [
    "key",
    "label",
    "type",
    "options",
    "subFields",
    "presetRows",
    "required",
    "placeholder",
    "helpText",
    "sortOrder",
  ] as const) {
    const v = (data as Record<string, unknown>)[k];
    if (v !== undefined) patch[k] = v;
  }

  await db
    .update(inspectionItemField)
    .set(patch)
    .where(
      and(
        eq(inspectionItemField.id, fieldId),
        eq(inspectionItemField.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function deleteInspectionItemField(
  orgSlug: string,
  fieldId: string,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  await db
    .delete(inspectionItemField)
    .where(
      and(
        eq(inspectionItemField.id, fieldId),
        eq(inspectionItemField.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items`);
}

/**
 * Reorder a whole list of fields by submitting their ids in the desired order.
 * Each id's index becomes its new `sort_order` value.
 */
export async function reorderInspectionItemFields(
  orgSlug: string,
  itemId: string,
  fieldIds: string[],
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  await getOwnedItem(m.organization.id, itemId);

  for (let i = 0; i < fieldIds.length; i++) {
    const id = fieldIds[i];
    if (!id) continue;
    await db
      .update(inspectionItemField)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(
        and(
          eq(inspectionItemField.id, id),
          eq(inspectionItemField.organizationId, m.organization.id),
          eq(inspectionItemField.inspectionItemId, itemId),
        ),
      );
  }
  revalidatePath(`/${orgSlug}/inspection-items`);
}

/* -------------------------------------------------------------------------- */
/*  Inspection-item TEMPLATES                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Save an existing inspection item AS a workspace-scoped template. The new
 * template is owned by the calling org; super-admin still sees it but no
 * other tenant does.
 */
export async function saveItemAsTemplate(
  orgSlug: string,
  itemId: string,
  input: { name?: string; description?: string | null } = {},
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const item = await getOwnedItem(m.organization.id, itemId);

  // Pull the full item row so we can copy its name / category / description.
  const [full] = await db
    .select()
    .from(inspectionItem)
    .where(eq(inspectionItem.id, item.id))
    .limit(1);
  if (!full) throw new Error("Item not found in this workspace");

  const fields = await snapshotItemFields(m.organization.id, item.id);

  const id = createId("iitpl");
  await db.insert(inspectionItemTemplate).values({
    id,
    organizationId: m.organization.id,
    name: (input.name?.trim() || full.name).slice(0, 160),
    description: input.description ?? full.description ?? null,
    categoryName: full.category,
    fields,
    autoSeed: false, // global-only flag — workspace templates ignore it
    isActive: true,
    createdById: m.user.id,
  });

  revalidatePath(`/${orgSlug}/inspection-items`);
  revalidatePath(`/${orgSlug}/inspection-items/templates`);
  return { id };
}

/**
 * Apply (clone) a template — global OR owned by the caller's org — into a
 * brand-new inspection item in the caller's workspace.
 */
export async function applyTemplate(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = applyTemplateInputSchema.parse(input);

  // Make sure the caller is allowed to see this template (global or own org).
  const [tpl] = await db
    .select({
      id: inspectionItemTemplate.id,
      organizationId: inspectionItemTemplate.organizationId,
      isActive: inspectionItemTemplate.isActive,
    })
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, data.templateId),
        or(
          isNull(inspectionItemTemplate.organizationId),
          eq(inspectionItemTemplate.organizationId, m.organization.id),
        ),
      ),
    )
    .limit(1);
  if (!tpl) throw new Error("Template not found");
  if (!tpl.isActive) throw new Error("This template is no longer active.");

  const result = await cloneTemplateIntoOrg({
    organizationId: m.organization.id,
    templateId: data.templateId,
    nameOverride: data.name,
    categoryId: data.categoryId,
    createdById: m.user.id,
  });

  revalidatePath(`/${orgSlug}/inspection-items`);
  return result;
}

/**
 * List templates that the caller can pick from when applying — both their own
 * workspace templates and any global ones managed by the platform admin.
 */
export async function listAvailableTemplates(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  const rows = await db
    .select({
      id: inspectionItemTemplate.id,
      organizationId: inspectionItemTemplate.organizationId,
      name: inspectionItemTemplate.name,
      description: inspectionItemTemplate.description,
      categoryName: inspectionItemTemplate.categoryName,
      fields: inspectionItemTemplate.fields,
      autoSeed: inspectionItemTemplate.autoSeed,
      isActive: inspectionItemTemplate.isActive,
      createdAt: inspectionItemTemplate.createdAt,
    })
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.isActive, true),
        or(
          isNull(inspectionItemTemplate.organizationId),
          eq(inspectionItemTemplate.organizationId, m.organization.id),
        ),
      ),
    )
    .orderBy(asc(inspectionItemTemplate.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    categoryName: r.categoryName,
    fieldCount: Array.isArray(r.fields) ? r.fields.length : 0,
    scope: r.organizationId === null ? ("global" as const) : ("workspace" as const),
    createdAt: r.createdAt,
  }));
}

/** List workspace-owned templates (for the templates management page). */
export async function listWorkspaceTemplates(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  const rows = await db
    .select()
    .from(inspectionItemTemplate)
    .where(eq(inspectionItemTemplate.organizationId, m.organization.id))
    .orderBy(asc(inspectionItemTemplate.name));
  return rows;
}

/** Update a workspace-owned template (cannot edit global ones from here). */
export async function updateWorkspaceTemplate(
  orgSlug: string,
  templateId: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemTemplateUpdateSchema.parse(input);

  const [existing] = await db
    .select({ id: inspectionItemTemplate.id })
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, templateId),
        eq(inspectionItemTemplate.organizationId, m.organization.id),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template not found in this workspace");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.categoryName !== undefined)
    patch.categoryName = data.categoryName ?? null;
  if (data.fields !== undefined) patch.fields = data.fields;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  // `autoSeed` is intentionally ignored — workspace templates can't be seeded.

  await db
    .update(inspectionItemTemplate)
    .set(patch)
    .where(
      and(
        eq(inspectionItemTemplate.id, templateId),
        eq(inspectionItemTemplate.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items/templates`);
}

/** Delete a workspace-owned template. */
export async function deleteWorkspaceTemplate(
  orgSlug: string,
  templateId: string,
) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  await db
    .delete(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, templateId),
        eq(inspectionItemTemplate.organizationId, m.organization.id),
      ),
    );
  revalidatePath(`/${orgSlug}/inspection-items/templates`);
}

/**
 * Create a workspace template from scratch (without copying an existing
 * item). Useful when an admin wants to author a template by hand.
 */
export async function createWorkspaceTemplate(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "inspectionItems:manage");
  const data = inspectionItemTemplateCreateSchema.parse(input);

  const id = createId("iitpl");
  await db.insert(inspectionItemTemplate).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    description: data.description ?? null,
    categoryName: data.categoryName ?? null,
    fields: data.fields,
    autoSeed: false,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });

  revalidatePath(`/${orgSlug}/inspection-items/templates`);
  return { id };
}
