"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { document, documentAck } from "@/lib/db/schema";
import { createId } from "@/lib/db/ids";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  fileUrl: z.string().optional(),
  requiresAck: z.boolean().default(false),
});

export async function createDocument(orgSlug: string, input: unknown) {
  const m = await requireMembership(orgSlug);
  const data = createSchema.parse(input);
  const id = createId("doc");
  await db.insert(document).values({
    id,
    organizationId: m.organization.id,
    name: data.name,
    category: data.category || null,
    description: data.description || null,
    fileUrl: data.fileUrl || null,
    requiresAck: data.requiresAck,
    createdById: m.user.id,
  });
  revalidatePath(`/${orgSlug}/documents`);
  redirect(`/${orgSlug}/documents`);
}

export async function acknowledgeDocument(orgSlug: string, documentId: string) {
  const m = await requireMembership(orgSlug);
  const [doc] = await db
    .select()
    .from(document)
    .where(and(eq(document.id, documentId), eq(document.organizationId, m.organization.id)));
  if (!doc) return;
  await db
    .insert(documentAck)
    .values({
      id: createId("ack"),
      organizationId: m.organization.id,
      documentId,
      userId: m.user.id,
      version: doc.currentVersion,
    })
    .onConflictDoNothing();
  revalidatePath(`/${orgSlug}/documents`);
}
