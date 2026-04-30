import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user, member, organization, session as sessionTable, auditLog } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [u] = await db.select().from(user).where(eq(user.id, params.id)).limit(1);
  if (!u) notFound();

  const memberships = await db
    .select({
      id: member.id,
      role: member.role,
      orgId: organization.id,
      orgName: organization.name,
      orgSlug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, u.id));

  const sessions = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.userId, u.id))
    .orderBy(desc(sessionTable.updatedAt))
    .limit(20);

  const events = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, u.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(15);

  return (
    <div className="space-y-6">
      <PageHeader
        title={u.name}
        description={u.email}
        actions={
          <Link
            href="/admin/users"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← All users
          </Link>
        }
      />

      {u.bannedAt && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="font-semibold">User is banned</div>
          <div className="text-xs">{u.banReason ?? "No reason provided."}</div>
        </div>
      )}
      {u.superAdmin && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="font-semibold text-primary">Super-admin</div>
          <div className="text-xs text-muted-foreground">
            Has full access to the platform admin panel.
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="ID" value={<code className="text-xs">{u.id}</code>} />
            <Row label="Email" value={u.email} />
            <Row label="Phone" value={u.phone ?? "—"} />
            <Row label="Email verified" value={u.emailVerified ? "Yes" : "No"} />
            <Row
              label="Joined"
              value={u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin actions</CardTitle>
          </CardHeader>
          <CardContent>
            <UserActions
              userId={u.id}
              userName={u.name}
              banned={Boolean(u.bannedAt)}
              superAdmin={u.superAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants ({memberships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {memberships.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">
                Not a member of any organization.
              </li>
            )}
            {memberships.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  href={`/admin/organizations/${m.orgId}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {m.orgName}
                </Link>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.role}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {sessions.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">No active sessions.</li>
            )}
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 text-xs">
                  <div className="truncate font-medium">{s.userAgent ?? "Unknown agent"}</div>
                  <div className="truncate text-muted-foreground">
                    {s.ipAddress ?? "—"} · expires{" "}
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "—"}
                    {s.impersonatedBy && (
                      <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                        impersonation
                      </span>
                    )}
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    const { revokeSession } = await import("../actions");
                    await revokeSession(s.id, u.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg border px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">No events.</li>
            )}
            {events.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{a.action}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.entityType ?? "—"} · {a.entityId ?? "—"}
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}
