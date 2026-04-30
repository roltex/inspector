import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { member, organization, type Role } from "@/lib/db/schema";
import { can, type Permission } from "@/lib/rbac/permissions";

export const getSession = cache(async () => {
  try {
    const session = await auth.api.getSession({ headers: headers() });
    return session;
  } catch {
    return null;
  }
});

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}

export async function getMembership(orgSlug: string) {
  const session = await getSession();
  if (!session?.user) return null;

  const [row] = await db
    .select({
      organization: organization,
      member: member,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(organization.slug, orgSlug), eq(member.userId, session.user.id)))
    .limit(1);

  if (!row) return null;
  return {
    user: session.user,
    organization: row.organization,
    member: row.member,
    role: row.member.role as Role,
  };
}

export async function requireMembership(orgSlug: string) {
  const m = await getMembership(orgSlug);
  if (!m) redirect("/sign-in");
  return m;
}

export async function requirePermission(orgSlug: string, permission: Permission) {
  const m = await requireMembership(orgSlug);
  if (!can(m.role, permission)) {
    redirect(`/${orgSlug}/dashboard?error=forbidden`);
  }
  return m;
}

export const getUserOrganizations = cache(async () => {
  const session = await getSession();
  if (!session?.user) return [];
  const rows = await db
    .select({ organization, member })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id));
  return rows;
});
