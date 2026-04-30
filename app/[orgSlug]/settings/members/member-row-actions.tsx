"use client";

import { useTransition } from "react";
import { Loader2, MoreHorizontal, ShieldCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, ROLE_LABELS } from "@/lib/rbac/permissions";
import type { Role } from "@/lib/db/schema";
import { useT } from "@/components/i18n-provider";
import { removeMember, updateMemberRole } from "./actions";

export function MemberRowActions({
  orgSlug,
  memberId,
  currentRole,
  callerRole,
  isSelf,
}: {
  orgSlug: string;
  memberId: string;
  currentRole: Role;
  callerRole: Role;
  isSelf: boolean;
}) {
  const t = useT();
  const [pending, start] = useTransition();

  // Non-OWNER cannot touch OWNER members or grant OWNER role.
  const canTouchTarget = callerRole === "OWNER" || currentRole !== "OWNER";
  const availableRoles = (callerRole === "OWNER" ? ROLES : ROLES.filter((r) => r !== "OWNER"));

  function changeRole(role: Role) {
    if (role === currentRole) return;
    start(async () => {
      try {
        await updateMemberRole(orgSlug, memberId, { role });
        toast.success(t("modules.members.roleChanged"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onRemove() {
    if (!confirm(t("modules.members.removeConfirm"))) return;
    start(async () => {
      try {
        await removeMember(orgSlug, memberId);
        toast.success(t("modules.members.removed"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  if (!canTouchTarget && !isSelf) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("modules.members.changeRole")}
        </DropdownMenuLabel>
        {availableRoles.map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => changeRole(r)}
            disabled={r === currentRole || !canTouchTarget}
            className="justify-between"
          >
            <span>{ROLE_LABELS[r]}</span>
            {r === currentRole && (
              <span className="text-xs text-muted-foreground">
                {t("modules.members.currentRole")}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        {!isSelf && canTouchTarget && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onRemove}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="h-4 w-4" />
              {t("modules.members.remove")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
