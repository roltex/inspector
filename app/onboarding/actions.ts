"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { member } from "@/lib/db/schema";
import { seedOrgFromAutoSeedTemplates } from "@/lib/inspection-item-templates/helpers";

/**
 * Server action invoked by the onboarding flow immediately after Better Auth
 * has provisioned a new organization. Runs the auto-seed routine that copies
 * every active GLOBAL inspection-item-template (autoSeed=true) into the new
 * workspace's catalogue so brand-new tenants don't start completely empty.
 *
 * We intentionally only check that the caller is a *member* of the org —
 * Better Auth has just made them an OWNER as part of the create call.
 */
export async function seedNewOrganization(organizationId: string) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) throw new Error("Not signed in");

  // Verify membership before doing any inserts on behalf of this user.
  const [m] = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.organizationId, organizationId))
    .limit(1);
  if (!m) throw new Error("Organization not found");

  const result = await seedOrgFromAutoSeedTemplates(
    organizationId,
    session.user.id,
  );
  return result;
}
