"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  banUser,
  unbanUser,
  setSuperAdmin,
  forceLogout,
} from "../actions";
import { impersonateUser } from "@/app/admin/impersonation/actions";

export function UserActions({
  userId,
  userName,
  banned,
  superAdmin,
}: {
  userId: string;
  userName: string;
  banned: boolean;
  superAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [reason, setReason] = React.useState("");

  function run(fn: () => Promise<void>, ok: string) {
    start(async () => {
      try {
        await fn();
        toast.success(ok);
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Super-admin</Label>
        {superAdmin ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setSuperAdmin(userId, false), "Super-admin revoked")}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Revoke super-admin
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setSuperAdmin(userId, true), "User promoted to super-admin")}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Grant super-admin
          </Button>
        )}
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Ban</Label>
        {banned ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => unbanUser(userId), "User unbanned")}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Unban user
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (shown to admins)"
              rows={2}
            />
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => banUser(userId, reason), "User banned")}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ban user
            </Button>
            <p className="text-xs text-muted-foreground">
              Banned users can&apos;t sign in and all sessions are revoked.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Sessions</Label>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => forceLogout(userId), "Sessions revoked")}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Force logout (revoke all sessions)
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Impersonation</Label>
        <Button
          disabled={pending || banned}
          onClick={() => {
            const ok = window.confirm(
              `Sign in as ${userName}? Your actions will be audited and a banner will be visible until you stop.`,
            );
            if (!ok) return;
            start(async () => {
              try {
                await impersonateUser(userId);
              } catch (err) {
                toast.error((err as Error).message);
              }
            });
          }}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Impersonate {userName}
        </Button>
        <p className="text-xs text-muted-foreground">
          Audited under <code>impersonate.start</code>.
        </p>
      </div>
    </div>
  );
}
