import Link from "next/link";
import { count, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user, member } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const filter = searchParams.filter ?? "all";

  const conditions = [];
  if (q) {
    conditions.push(or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)));
  }
  if (filter === "banned") conditions.push(isNotNull(user.bannedAt));
  if (filter === "admin") conditions.push(eq(user.superAdmin, true));

  const where = conditions.length ? sql.join(conditions, sql` and `) : undefined;

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      superAdmin: user.superAdmin,
      bannedAt: user.bannedAt,
      createdAt: user.createdAt,
      orgCount: sql<number>`(select count(*) from ${member} m where m.user_id = ${user.id})`,
    })
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(200);

  const [tot] = await db.select({ c: count() }).from(user);

  const tabs: Array<{ id: string; label: string }> = [
    { id: "all", label: "All" },
    { id: "admin", label: "Super-admins" },
    { id: "banned", label: "Banned" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description={`${tot?.c ?? 0} user${tot?.c === 1 ? "" : "s"} across all tenants.`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex-1 max-w-md">
          <Input name="q" defaultValue={q} placeholder="Search by name or email…" />
          <input type="hidden" name="filter" value={filter} />
        </form>
        <div className="flex gap-1 rounded-xl border bg-card p-1">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/admin/users?filter=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <div className="col-span-5">User</div>
          <div className="col-span-2">Roles</div>
          <div className="col-span-2 text-right">Tenants</div>
          <div className="col-span-3 text-right">Joined</div>
        </div>
        <ul className="divide-y">
          {users.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No users found.
            </li>
          )}
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-1 gap-2 px-4 py-3 hover:bg-muted/50 md:grid-cols-12 md:items-center md:gap-3"
              >
                <div className="col-span-5 min-w-0">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="col-span-2 flex flex-wrap gap-1 text-xs">
                  {u.superAdmin && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      super-admin
                    </span>
                  )}
                  {u.bannedAt && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      banned
                    </span>
                  )}
                  {!u.superAdmin && !u.bannedAt && (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right text-sm text-muted-foreground">
                  {Number(u.orgCount ?? 0)}
                </div>
                <div className="col-span-3 text-right text-xs text-muted-foreground">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
