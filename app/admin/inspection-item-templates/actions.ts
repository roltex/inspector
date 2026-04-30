"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inspectionItemTemplate } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";
import {
  inspectionItemGlobalTemplateCreateSchema,
  inspectionItemTemplateUpdateSchema,
} from "@/lib/validators/inspection-item-templates";

/* -------------------------------------------------------------------------- */
/*  Read                                                                      */
/* -------------------------------------------------------------------------- */

/** List every GLOBAL template (organizationId IS NULL). */
export async function listGlobalTemplates() {
  await requireSuperAdmin();
  return db
    .select()
    .from(inspectionItemTemplate)
    .where(isNull(inspectionItemTemplate.organizationId))
    .orderBy(asc(inspectionItemTemplate.name));
}

/** Fetch one global template by id. Throws if missing or not global. */
export async function getGlobalTemplate(id: string) {
  await requireSuperAdmin();
  const [row] = await db
    .select()
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, id),
        isNull(inspectionItemTemplate.organizationId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Global template not found");
  return row;
}

/* -------------------------------------------------------------------------- */
/*  Create / update / delete                                                  */
/* -------------------------------------------------------------------------- */

export async function createGlobalTemplate(input: unknown) {
  const admin = await requireSuperAdmin();
  const data = inspectionItemGlobalTemplateCreateSchema.parse(input);

  const id = createId("iitpl");
  await db.insert(inspectionItemTemplate).values({
    id,
    organizationId: null, // global
    name: data.name,
    description: data.description ?? null,
    categoryName: data.categoryName ?? null,
    fields: data.fields,
    autoSeed: data.autoSeed ?? false,
    isActive: data.isActive ?? true,
    createdById: admin.id,
  });

  await recordAudit({
    userId: admin.id,
    action: "admin.inspection_item_template.create",
    entityType: "inspection_item_template",
    entityId: id,
    data: {
      name: data.name,
      autoSeed: data.autoSeed ?? false,
      fieldCount: data.fields.length,
    },
  });

  revalidatePath("/admin/inspection-item-templates");
  return { id };
}

export async function updateGlobalTemplate(id: string, input: unknown) {
  const admin = await requireSuperAdmin();
  const data = inspectionItemTemplateUpdateSchema.parse(input);

  const [existing] = await db
    .select({ id: inspectionItemTemplate.id })
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, id),
        isNull(inspectionItemTemplate.organizationId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Global template not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.categoryName !== undefined)
    patch.categoryName = data.categoryName ?? null;
  if (data.fields !== undefined) patch.fields = data.fields;
  if (data.autoSeed !== undefined) patch.autoSeed = data.autoSeed;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  await db
    .update(inspectionItemTemplate)
    .set(patch)
    .where(
      and(
        eq(inspectionItemTemplate.id, id),
        isNull(inspectionItemTemplate.organizationId),
      ),
    );

  await recordAudit({
    userId: admin.id,
    action: "admin.inspection_item_template.update",
    entityType: "inspection_item_template",
    entityId: id,
    data: {
      keys: Object.keys(patch).filter((k) => k !== "updatedAt"),
    },
  });

  revalidatePath("/admin/inspection-item-templates");
  revalidatePath(`/admin/inspection-item-templates/${id}`);
}

export async function deleteGlobalTemplate(id: string) {
  const admin = await requireSuperAdmin();

  const [existing] = await db
    .select({ id: inspectionItemTemplate.id, name: inspectionItemTemplate.name })
    .from(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, id),
        isNull(inspectionItemTemplate.organizationId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Global template not found");

  await db
    .delete(inspectionItemTemplate)
    .where(
      and(
        eq(inspectionItemTemplate.id, id),
        isNull(inspectionItemTemplate.organizationId),
      ),
    );

  await recordAudit({
    userId: admin.id,
    action: "admin.inspection_item_template.delete",
    entityType: "inspection_item_template",
    entityId: id,
    data: { name: existing.name },
  });

  revalidatePath("/admin/inspection-item-templates");
}

/** Quick toggle for the autoSeed flag (used from the row action menu). */
export async function setGlobalTemplateAutoSeed(id: string, value: boolean) {
  return updateGlobalTemplate(id, { autoSeed: value });
}

/**
 * Take an existing WORKSPACE-owned template and copy it as a fresh GLOBAL
 * template — the simplest path for "I authored this in my workspace, please
 * make it available to all tenants".
 */
export async function promoteWorkspaceTemplateToGlobal(
  sourceTemplateId: string,
  options: { name?: string; autoSeed?: boolean } = {},
) {
  const admin = await requireSuperAdmin();
  const [src] = await db
    .select()
    .from(inspectionItemTemplate)
    .where(eq(inspectionItemTemplate.id, sourceTemplateId))
    .limit(1);
  if (!src) throw new Error("Source template not found");
  if (src.organizationId === null) {
    throw new Error("Template is already global.");
  }

  const id = createId("iitpl");
  await db.insert(inspectionItemTemplate).values({
    id,
    organizationId: null,
    name: options.name?.trim() || src.name,
    description: src.description,
    categoryName: src.categoryName,
    fields: src.fields,
    autoSeed: options.autoSeed ?? false,
    isActive: true,
    createdById: admin.id,
  });

  await recordAudit({
    userId: admin.id,
    action: "admin.inspection_item_template.promote",
    entityType: "inspection_item_template",
    entityId: id,
    data: {
      sourceTemplateId,
      name: options.name?.trim() || src.name,
      autoSeed: options.autoSeed ?? false,
    },
  });

  revalidatePath("/admin/inspection-item-templates");
  return { id };
}
