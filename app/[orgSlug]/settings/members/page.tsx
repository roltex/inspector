import { asc, eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { member, user, type Role } from "@/lib/db/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n";
import { CreateMemberDialog } from "./create-member-dialog";
import { MemberRowActions } from "./member-row-actions";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();
  const canManage = m.role === "OWNER" || m.role === "ADMIN";

  const rows = await db
    .select({ member, user })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, m.organization.id))
    .orderBy(asc(user.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length === 1
            ? t("modules.members.countOne")
            : t("modules.members.countMany", { count: rows.length })}
        </p>
        {canManage && (
          <CreateMemberDialog orgSlug={params.orgSlug} callerRole={m.role} />
        )}
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y">
          {rows.map(({ member: mem, user: u }) => {
            const initials = (u.name ?? u.email)
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const isSelf = u.id === m.user.id;
            return (
              <li key={mem.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar>
                  <AvatarFallback>
                    {initials || <Users className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {u.name || u.email}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({t("modules.members.you")})
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    ROLE_COLORS[mem.role as Role],
                  )}
                >
                  {ROLE_LABELS[mem.role as Role]}
                </span>
                {canManage && (
                  <MemberRowActions
                    orgSlug={params.orgSlug}
                    memberId={mem.id}
                    currentRole={mem.role as Role}
                    callerRole={m.role}
                    isSelf={isSelf}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
