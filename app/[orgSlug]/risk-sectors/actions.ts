"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { requirePermission, requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { companyObject, riskLevel, riskSector } from "@/lib/db/schema";
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
  if (!row) throw new Error("Risk sector not found in this workspace");
  return row;
}

/** Ensure the `risk_level` belongs to the same workspace — defends
 *  against a client tampering with the hidden select id. */
async function assertOwnedLevel(orgId: string, id: string | null | undefined) {
  if (!id) return;
  const [row] = await db
    .select({ id: riskLevel.id })
    .from(riskLevel)
    .where(and(eq(riskLevel.id, id), eq(riskLevel.organizationId, orgId)))
    .limit(1);
  if (!row) throw new Error("Risk level not found in this workspace");
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/** List every sector in the caller's workspace, joined to its risk level
 *  and with the number of company objects currently tagged. */
export async function listRiskSectors(orgSlug: string) {
  const m = await requireMembership(orgSlug);

  const [sectors, counts] = await Promise.all([
    db
      .select({
        id: riskSector.id,
        name: riskSector.name,
        code: riskSector.code,
        description: riskSector.description,
        riskLevelId: riskSector.riskLevelId,
        color: riskSector.color,
        sortOrder: riskSector.sortOrder,
        isActive: riskSector.isActive,
        createdAt: riskSector.createdAt,
        updatedAt: riskSector.updatedAt,
        levelName: riskLevel.name,
        levelTone: riskLevel.tone,
        levelCode: riskLevel.code,
        levelScore: riskLevel.score,
      })
      .from(riskSector)
      .leftJoin(riskLevel, eq(riskLevel.id, riskSector.riskLevelId))
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
  ]);

  const usage = new Map<string, number>();
  for (const r of counts) {
    if (r.riskSectorId) usage.set(r.riskSectorId, Number(r.c));
  }

  return sectors.map((s) => ({ ...s, objectCount: usage.get(s.id) ?? 0 }));
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
      levelTone: riskLevel.tone,
      levelName: riskLevel.name,
    })
    .from(riskSector)
    .leftJoin(riskLevel, eq(riskLevel.id, riskSector.riskLevelId))
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
    throw new Error("A sector with this name already exists in this workspace.");
  }

  await assertOwnedLevel(m.organization.id, data.riskLevelId ?? null);

  const id = createId("rsec");
  await db.insert(riskSector).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    code: data.code ?? null,
    description: data.description ?? null,
    riskLevelId: data.riskLevelId ?? null,
    color: data.color ?? null,
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });

  revalidatePath(`/${orgSlug}/risk-sectors`);
  revalidatePath(`/${orgSlug}/companies`);
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

  if (data.riskLevelId !== undefined) {
    await assertOwnedLevel(m.organization.id, data.riskLevelId ?? null);
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.code !== undefined) patch.code = data.code ?? null;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.riskLevelId !== undefined) patch.riskLevelId = data.riskLevelId ?? null;
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
}

export async function deleteRiskSector(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "riskSectors:manage");
  await getOwnedSector(m.organization.id, id);

  // FK is ON DELETE SET NULL on company_object.risk_sector_id, so objects
  // that were tagged become "unclassified".
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
}
