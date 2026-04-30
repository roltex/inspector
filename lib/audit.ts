import "server-only";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

export interface AuditEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      organizationId: entry.organizationId ?? null,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      data: entry.data ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
