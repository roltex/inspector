"use server";

import { revalidatePath } from "next/cache";
import { and, asc, countDistinct, eq } from "drizzle-orm";
import { requirePermission, requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { inspectionItemApplicability, riskLevel } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import {
  riskLevelCreateSchema,
  riskLevelUpdateSchema,
} from "@/lib/validators/risk-levels";

async function getOwnedLevel(orgId: string, id: string) {
  const [row] = await db
    .select({ id: riskLevel.id, name: riskLevel.name })
    .from(riskLevel)
    .where(and(eq(riskLevel.id, id), eq(riskLevel.organizationId, orgId)))
    .limit(1);
  if (!row) throw new Error("Risk level not found in this workspace");
  return row;
}

/**
 * List every risk level in the caller's workspace, annotated with the
 * number of distinct inspection forms that currently reference it through
 * the applicability matrix. "0 forms" is a useful signal that the level
 * is safe to rename or delete.
 */
export async function listRiskLevels(orgSlug: string) {
  const m = await requireMembership(orgSlug);

  const [levels, counts] = await Promise.all([
    db
      .select()
      .from(riskLevel)
      .where(eq(riskLevel.organizationId, m.organization.id))
      .orderBy(
        asc(riskLevel.sortOrder),
        asc(riskLevel.score),
        asc(riskLevel.name),
      ),
    db
      .select({
        riskLevelId: inspectionItemApplicability.riskLevelId,
        c: countDistinct(inspectionItemApplicability.inspectionItemId),
      })
      .from(inspectionItemApplicability)
      .where(
        eq(inspectionItemApplicability.organizationId, m.organization.id),
      )
      .groupBy(inspectionItemApplicability.riskLevelId),
  ]);

  const usage = new Map<string, number>();
  for (const r of counts) {
    if (r.riskLevelId) usage.set(r.riskLevelId, Number(r.c));
  }

  return levels.map((l) => ({ ...l, formCount: usage.get(l.id) ?? 0 }));
}

/** Thin option list — used by the risk-sector form picker. */
export async function listActiveRiskLevelOptions(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  return db
    .select({
      id: riskLevel.id,
      name: riskLevel.name,
      code: riskLevel.code,
      tone: riskLevel.tone,
      score: riskLevel.score,
    })
    .from(riskLevel)
    .where(
      and(
        eq(riskLevel.organizationId, m.organization.id),
        eq(riskLevel.isActive, true),
      ),
    )
    .orderBy(
      asc(riskLevel.sortOrder),
      asc(riskLevel.score),
      asc(riskLevel.name),
    );
}

export async function createRiskLevel(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "riskLevels:manage");
  const data = riskLevelCreateSchema.parse(input);

  const [existing] = await db
    .select({ id: riskLevel.id })
    .from(riskLevel)
    .where(
      and(
        eq(riskLevel.organizationId, m.organization.id),
        eq(riskLevel.name, data.name),
      ),
    )
    .limit(1);
  if (existing) {
    throw new Error("A risk level with this name already exists.");
  }

  const id = createId("rlvl");
  await db.insert(riskLevel).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    code: data.code ?? null,
    description: data.description ?? null,
    tone: data.tone ?? "muted",
    score: data.score ?? 0,
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });

  revalidatePath(`/${orgSlug}/risk-levels`);
  revalidatePath(`/${orgSlug}/inspection-items`);
  return { id };
}

export async function updateRiskLevel(
  orgSlug: string,
  id: string,
  input: unknown,
) {
  const m = await requirePermission(orgSlug, "riskLevels:manage");
  const data = riskLevelUpdateSchema.parse(input);
  await getOwnedLevel(m.organization.id, id);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.code !== undefined) patch.code = data.code ?? null;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.tone !== undefined) patch.tone = data.tone;
  if (data.score !== undefined) patch.score = data.score;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  await db
    .update(riskLevel)
    .set(patch)
    .where(
      and(
        eq(riskLevel.id, id),
        eq(riskLevel.organizationId, m.organization.id),
      ),
    );

  revalidatePath(`/${orgSlug}/risk-levels`);
  revalidatePath(`/${orgSlug}/inspection-items`);
}

export async function deleteRiskLevel(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "riskLevels:manage");
  await getOwnedLevel(m.organization.id, id);

  // `inspection_item_applicability.risk_level_id` is ON DELETE CASCADE, so
  // any matrix rows referencing this level vanish with it. Forms themselves
  // are untouched — they just lose that specific applicability pairing.
  await db
    .delete(riskLevel)
    .where(
      and(
        eq(riskLevel.id, id),
        eq(riskLevel.organizationId, m.organization.id),
      ),
    );

  revalidatePath(`/${orgSlug}/risk-levels`);
  revalidatePath(`/${orgSlug}/inspection-items`);
}
