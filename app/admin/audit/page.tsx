import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, organization, user } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { q?: string; org?: string; from?: string; to?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const org = (searchParams.org ?? "").trim();
  const from = (searchParams.from ?? "").trim();
  const to = (searchParams.to ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

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
      userName: user.name,
      userEmail: user.email,
    })
    .from(auditLog)
    .leftJoin(organization, eq(organization.id, auditLog.organizationId))
    .leftJoin(user, eq(user.id, auditLog.userId))
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const [tot] = await db.select({ c: count() }).from(auditLog).where(where);
  const totalPages = Math.max(1, Math.ceil(Number(tot?.c ?? 0) / PAGE_SIZE));

  const csvParams = new URLSearchParams();
  if (q) csvParams.set("q", q);
  if (org) csvParams.set("org", org);
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description={`${tot?.c ?? 0} events.`}
        actions={
          <Link
            href={`/admin/audit/export?${csvParams.toString()}`}
            className="rounded-xl border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Export CSV
          </Link>
        }
      />

      <form className="grid gap-2 md:grid-cols-4">
        <Input name="q" defaultValue={q} placeholder="Action contains…" />
        <Input name="org" defaultValue={org} placeholder="Organization id" />
        <Input name="from" type="date" defaultValue={from} />
        <Input name="to" type="date" defaultValue={to} />
      </form>

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matching audit events.
            </li>
          )}
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-12 md:items-center">
              <div className="md:col-span-3">
                <div className="font-medium text-sm">{r.action}</div>
                <div className="text-xs text-muted-foreground">
                  {r.entityType ?? "—"} · {r.entityId ?? "—"}
                </div>
              </div>
              <div className="md:col-span-3 text-xs">
                {r.userName ? (
                  <Link href={`/admin/users/${r.userId}`} className="hover:underline">
                    {r.userName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">system</span>
                )}
                <div className="text-muted-foreground truncate">{r.userEmail ?? ""}</div>
              </div>
              <div className="md:col-span-3 text-xs">
                {r.orgId ? (
                  <Link href={`/admin/organizations/${r.orgId}`} className="hover:underline">
                    {r.orgName ?? r.orgId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <div className="text-muted-foreground">{r.ipAddress ?? ""}</div>
              </div>
              <div className="md:col-span-3 text-right text-xs text-muted-foreground">
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Link
            href={`/admin/audit?${new URLSearchParams({
              ...(q && { q }),
              ...(org && { org }),
              ...(from && { from }),
              ...(to && { to }),
              page: String(Math.max(1, page - 1)),
            }).toString()}`}
            className="rounded-xl border px-3 py-1.5"
          >
            Previous
          </Link>
          <Link
            href={`/admin/audit?${new URLSearchParams({
              ...(q && { q }),
              ...(org && { org }),
              ...(from && { from }),
              ...(to && { to }),
              page: String(Math.min(totalPages, page + 1)),
            }).toString()}`}
            className="rounded-xl border px-3 py-1.5"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
