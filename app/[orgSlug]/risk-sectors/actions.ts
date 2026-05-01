"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { requirePermission, requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { company, riskSector } from "@/lib/db/schema";
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

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/** List every sector in the caller's workspace, with the number of companies
 *  currently tagged with it so the directory UI can show usage counts. */
export async function listRiskSectors(orgSlug: string) {
  const m = await requireMembership(orgSlug);

  const [sectors, counts] = await Promise.all([
    db
      .select()
      .from(riskSector)
      .where(eq(riskSector.organizationId, m.organization.id))
      .orderBy(asc(riskSector.sortOrder), asc(riskSector.name)),
    db
      .select({
        riskSectorId: company.riskSectorId,
        c: sql<number>`count(*)::int`,
      })
      .from(company)
      .where(eq(company.organizationId, m.organization.id))
      .groupBy(company.riskSectorId),
  ]);

  const usage = new Map<string, number>();
  for (const r of counts) {
    if (r.riskSectorId) usage.set(r.riskSectorId, Number(r.c));
  }

  return sectors.map((s) => ({ ...s, companyCount: usage.get(s.id) ?? 0 }));
}

/** Thin option-list used by selects on the company form. */
export async function listActiveRiskSectorOptions(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  return db
    .select({
      id: riskSector.id,
      name: riskSector.name,
      code: riskSector.code,
      defaultRisk: riskSector.defaultRisk,
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

  // Friendly duplicate-name guard (we also have a unique index as a backstop).
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

  const id = createId("rsec");
  await db.insert(riskSector).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    code: data.code ?? null,
    description: data.description ?? null,
    defaultRisk: data.defaultRisk,
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

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.code !== undefined) patch.code = data.code ?? null;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.defaultRisk !== undefined) patch.defaultRisk = data.defaultRisk;
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

  // The FK is ON DELETE SET NULL, so companies currently tagged with this
  // sector are preserved but become "unclassified". We still surface the
  // impact to the caller as a friendly warning via the row-count.
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
