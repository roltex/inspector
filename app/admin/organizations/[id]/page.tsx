import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organization, member, user, auditLog } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgActions } from "./org-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrgDetailPage({ params }: { params: { id: string } }) {
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, params.id))
    .limit(1);
  if (!org) notFound();

  const members = await db
    .select({
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      bannedAt: user.bannedAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, org.id))
    .orderBy(desc(member.createdAt));

  const events = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.organizationId, org.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(15);

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={`/${org.slug} · created ${new Date(org.createdAt).toLocaleDateString()}`}
        actions={
          <Link
            href="/admin/organizations"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← All tenants
          </Link>
        }
      />

      {org.suspendedAt && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="font-semibold">Tenant is suspended</div>
          <div className="text-xs">{org.suspendedReason ?? "No reason provided."}</div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Plan" value={org.plan} />
            <Row label="Status" value={org.subscriptionStatus ?? "—"} />
            <Row
              label="Stripe customer"
              value={
                org.stripeCustomerId ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${org.stripeCustomerId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {org.stripeCustomerId}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="Stripe subscription"
              value={org.stripeSubscriptionId ?? "—"}
            />
            <Row
              label="Period ends"
              value={
                org.currentPeriodEnd
                  ? new Date(org.currentPeriodEnd).toLocaleDateString()
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin actions</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgActions
              orgId={org.id}
              orgName={org.name}
              currentPlan={org.plan}
              suspended={Boolean(org.suspendedAt)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {members.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">No members.</li>
            )}
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/${m.userId}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {m.userName}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">{m.userEmail}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {m.bannedAt && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      banned
                    </span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5">{m.role}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
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
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
