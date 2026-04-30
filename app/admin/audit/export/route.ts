import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, organization, user } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin();
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const org = url.searchParams.get("org")?.trim() ?? "";
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";

  const conds: SQL[] = [];
  if (q) conds.push(ilike(auditLog.action, `%${q}%`));
  if (org) conds.push(eq(auditLog.organizationId, org));
  if (from) conds.push(gte(auditLog.createdAt, new Date(from)));
  if (to) {
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    conds.push(lte(auditLog.createdAt, end));
  }
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      data: auditLog.data,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      orgId: auditLog.organizationId,
      orgName: organization.name,
      userId: auditLog.userId,
      userEmail: user.email,
    })
    .from(auditLog)
    .leftJoin(organization, eq(organization.id, auditLog.organizationId))
    .leftJoin(user, eq(user.id, auditLog.userId))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(50_000);

  const header = [
    "id",
    "createdAt",
    "action",
    "entityType",
    "entityId",
    "userId",
    "userEmail",
    "organizationId",
    "organizationName",
    "ipAddress",
    "data",
  ];

  function csvField(v: unknown): string {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.createdAt ? new Date(r.createdAt).toISOString() : "",
        r.action,
        r.entityType ?? "",
        r.entityId ?? "",
        r.userId ?? "",
        r.userEmail ?? "",
        r.orgId ?? "",
        r.orgName ?? "",
        r.ipAddress ?? "",
        r.data ?? "",
      ]
        .map(csvField)
        .join(","),
    );
  }

  await recordAudit({
    userId: admin.id,
    action: "admin.audit.export",
    data: { rows: rows.length, q, org, from, to },
  });

  const filename = `inspector-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
