"use server";

import { revalidatePath } from "next/cache";
import { and, asc, countDistinct, eq, sql } from "drizzle-orm";
import { requirePermission, requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  companyObject,
  inspectionItemApplicability,
  riskSector,
} from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import {
  riskSectorCreateSchema,
  riskSectorUpdateSchema,
} from "@/lib/validators/risk-sectors";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

async function getOwnedSector(orgId: string, id: string) {
  const [row] = await db
    .select({
      id: riskSector.id,
      name: riskSector.name,
      isActive: riskSector.isActive,
    })
    .from(riskSector)
    .where(and(eq(riskSector.id, id), eq(riskSector.organizationId, orgId)))
    .limit(1);
  if (!row) throw new Error("Inspect item not found in this workspace");
  return row;
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every inspect item in the caller's workspace, plus two usage counters:
 *   - `objectCount`  — company objects that point at this item
 *   - `formCount`    — distinct inspection forms that reference it in their
 *                      applicability matrix
 */
export async function listRiskSectors(orgSlug: string) {
  const m = await requireMembership(orgSlug);

  const [sectors, objectCounts, formCounts] = await Promise.all([
    db
      .select()
      .from(riskSector)
      .where(eq(riskSector.organizationId, m.organization.id))
      .orderBy(asc(riskSector.sortOrder), asc(riskSector.name)),
    db
      .select({
        riskSectorId: companyObject.riskSectorId,
        c: sql<number>`count(*)::int`,
      })
      .from(companyObject)
      .where(eq(companyObject.organizationId, m.organization.id))
      .groupBy(companyObject.riskSectorId),
    db
      .select({
        riskSectorId: inspectionItemApplicability.riskSectorId,
        c: countDistinct(inspectionItemApplicability.inspectionItemId),
      })
      .from(inspectionItemApplicability)
      .where(
        eq(inspectionItemApplicability.organizationId, m.organization.id),
      )
      .groupBy(inspectionItemApplicability.riskSectorId),
  ]);

  const objectUsage = new Map<string, number>();
  for (const r of objectCounts) {
    if (r.riskSectorId) objectUsage.set(r.riskSectorId, Number(r.c));
  }
  const formUsage = new Map<string, number>();
  for (const r of formCounts) {
    if (r.riskSectorId) formUsage.set(r.riskSectorId, Number(r.c));
  }

  return sectors.map((s) => ({
    ...s,
    objectCount: objectUsage.get(s.id) ?? 0,
    formCount: formUsage.get(s.id) ?? 0,
  }));
}

/** Option list used by the object create / edit dialog. */
export async function listActiveRiskSectorOptions(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  return db
    .select({
      id: riskSector.id,
      name: riskSector.name,
      code: riskSector.code,
      color: riskSector.color,
    })
    .from(riskSector)
    .where(
      and(
        eq(riskSector.organizationId, m.organization.id),
        eq(riskSector.isActive, true),
      ),
    )
    .orderBy(asc(riskSector.sortOrder), asc(riskSector.name));
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

export async function createRiskSector(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "riskSectors:manage");
  const data = riskSectorCreateSchema.parse(input);

  const [existing] = await db
    .select({ id: riskSector.id })
    .from(riskSector)
    .where(
      and(
        eq(riskSector.organizationId, m.organization.id),
        eq(riskSector.name, data.name),
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error("An inspect item with this name already exists in this workspace.");
  }

  const id = createId("rsec");
  await db.insert(riskSector).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    code: data.code ?? null,
    description: data.description ?? null,
    color: data.color ?? null,
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });

  revalidatePath(`/${orgSlug}/risk-sectors`);
  revalidatePath(`/${orgSlug}/companies`);
  revalidatePath(`/${orgSlug}/inspection-items`);
  return { id };
}

export async function updateRiskSector(
  orgSlug: string,
  id: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "riskSectors:manage");
  const data = riskSectorUpdateSchema.parse(input);
  await getOwnedSector(m.organization.id, id);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.code !== undefined) patch.code = data.code ?? null;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.color !== undefined) patch.color = data.color ?? null;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  await db
    .update(riskSector)
    .set(patch)
    .where(
      and(
        eq(riskSector.id, id),
        eq(riskSector.organizationId, m.organization.id),
      ),
    );

  revalidatePath(`/${orgSlug}/risk-sectors`);
  revalidatePath(`/${orgSlug}/companies`);
  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function deleteRiskSector(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "riskSectors:manage");
  await getOwnedSector(m.organization.id, id);

  // FK is ON DELETE SET NULL on `company_object.risk_sector_id`, so objects
  // that were tagged become "unclassified". `inspection_item_applicability`
  // is ON DELETE CASCADE, so any pairings drop automatically.
  await db
    .delete(riskSector)
    .where(
      and(
        eq(riskSector.id, id),
        eq(riskSector.organizationId, m.organization.id),
      ),
    );

  revalidatePath(`/${orgSlug}/risk-sectors`);
  revalidatePath(`/${orgSlug}/companies`);
  revalidatePath(`/${orgSlug}/inspection-items`);
}
