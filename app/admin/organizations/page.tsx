import Link from "next/link";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organization, member } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const where = q
    ? or(ilike(organization.name, `%${q}%`), ilike(organization.slug, `%${q}%`))
    : undefined;

  const orgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      subscriptionStatus: organization.subscriptionStatus,
      suspendedAt: organization.suspendedAt,
      createdAt: organization.createdAt,
      memberCount: sql<number>`(select count(*) from ${member} m where m.organization_id = ${organization.id})`,
    })
    .from(organization)
    .where(where)
    .orderBy(desc(organization.createdAt))
    .limit(200);

  const [tot] = await db.select({ c: count() }).from(organization);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tenants"
        description={`${tot?.c ?? 0} organization${tot?.c === 1 ? "" : "s"} across the platform.`}
      />
      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or slug…" />
      </form>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <div className="col-span-4">Tenant</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Members</div>
          <div className="col-span-3 text-right">Created</div>
        </div>
        <ul className="divide-y">
          {orgs.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No organizations found.
            </li>
          )}
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/organizations/${o.id}`}
                className="grid grid-cols-1 gap-2 px-4 py-3 hover:bg-muted/50 md:grid-cols-12 md:items-center md:gap-3"
              >
                <div className="col-span-4 min-w-0">
                  <div className="truncate font-medium">{o.name}</div>
                  <div className="truncate text-xs text-muted-foreground">/{o.slug}</div>
                </div>
                <div className="col-span-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {o.plan}
                  </span>
                </div>
                <div className="col-span-2 text-xs">
                  {o.suspendedAt ? (
                    <span className="text-destructive">Suspended</span>
                  ) : (
                    <span className="text-muted-foreground">{o.subscriptionStatus ?? "—"}</span>
                  )}
                </div>
                <div className="col-span-1 text-right text-sm text-muted-foreground">
                  {Number(o.memberCount ?? 0)}
                </div>
                <div className="col-span-3 text-right text-xs text-muted-foreground">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
