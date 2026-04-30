"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requirePermission, requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { company, companyObject } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";
import {
  companyCreateSchema,
  companyUpdateSchema,
  companyObjectCreateSchema,
  companyObjectUpdateSchema,
} from "@/lib/validators/companies";

/* -------------------------------------------------------------------------- */
/*  Companies                                                                 */
/* -------------------------------------------------------------------------- */

export async function createCompany(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "companies:manage");
  const data = companyCreateSchema.parse(input);
  const id = createId("co");
  await db.insert(company).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    code: data.code,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    address: data.address,
    notes: data.notes,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/companies`);
  redirect(`/${orgSlug}/companies/${id}`);
}

export async function updateCompany(orgSlug: string, id: string, input: unknown) {
  const m = await requirePermission(orgSlug, "companies:manage");
  const data = companyUpdateSchema.parse(input);
  await db
    .update(company)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(company.id, id), eq(company.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/companies`);
  revalidatePath(`/${orgSlug}/companies/${id}`);
}

export async function deleteCompany(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "companies:manage");
  await db
    .delete(company)
    .where(and(eq(company.id, id), eq(company.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/companies`);
  redirect(`/${orgSlug}/companies`);
}

/* -------------------------------------------------------------------------- */
/*  Objects (branches / franchises under a company)                           */
/* -------------------------------------------------------------------------- */

export async function createCompanyObject(orgSlug: string, input: unknown) {
  const m = await requirePermission(orgSlug, "companies:manage");
  const data = companyObjectCreateSchema.parse(input);

  // Make sure the parent company belongs to this org.
  const [parent] = await db
    .select({ id: company.id })
    .from(company)
    .where(and(eq(company.id, data.companyId), eq(company.organizationId, m.organization.id)))
    .limit(1);
  if (!parent) throw new Error("Company not found in workspace");

  const id = createId("obj");
  await db.insert(companyObject).values({
    id,
    organizationId: m.organization.id,
    companyId: data.companyId,
    name: data.name,
    code: data.code,
    type: data.type,
    address: data.address,
    city: data.city,
    country: data.country,
    managerName: data.managerName,
    managerEmail: data.managerEmail,
    managerPhone: data.managerPhone,
    notes: data.notes,
    isActive: data.isActive ?? true,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/companies/${data.companyId}`);
}

export async function updateCompanyObject(orgSlug: string, id: string, input: unknown) {
  const m = await requirePermission(orgSlug, "companies:manage");
  const data = companyObjectUpdateSchema.parse(input);
  await db
    .update(companyObject)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(companyObject.id, id), eq(companyObject.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/companies`);
}

export async function deleteCompanyObject(orgSlug: string, id: string) {
  const m = await requirePermission(orgSlug, "companies:manage");
  const [row] = await db
    .select({ companyId: companyObject.companyId })
    .from(companyObject)
    .where(and(eq(companyObject.id, id), eq(companyObject.organizationId, m.organization.id)))
    .limit(1);
  if (!row) return;
  await db
    .delete(companyObject)
    .where(and(eq(companyObject.id, id), eq(companyObject.organizationId, m.organization.id)));
  revalidatePath(`/${orgSlug}/companies/${row.companyId}`);
}

/* -------------------------------------------------------------------------- */
/*  Read helpers (for forms / pickers)                                        */
/* -------------------------------------------------------------------------- */

export async function listCompaniesForPicker(orgSlug: string) {
  const m = await requireMembership(orgSlug);
  return db
    .select({
      id: company.id,
      name: company.name,
      isActive: company.isActive,
    })
    .from(company)
    .where(eq(company.organizationId, m.organization.id));
}

export async function listObjectsForCompany(orgSlug: string, companyId: string) {
  const m = await requireMembership(orgSlug);
  return db
    .select({
      id: companyObject.id,
      name: companyObject.name,
      type: companyObject.type,
      city: companyObject.city,
      isActive: companyObject.isActive,
    })
    .from(companyObject)
    .where(
      and(
        eq(companyObject.organizationId, m.organization.id),
        eq(companyObject.companyId, companyId),
      ),
    );
}
