"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changeOrgPlan,
  suspendOrg,
  unsuspendOrg,
  deleteOrg,
} from "../actions";

export function OrgActions({
  orgId,
  orgName,
  currentPlan,
  suspended,
}: {
  orgId: string;
  orgName: string;
  currentPlan: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [plan, setPlan] = React.useState(currentPlan);
  const [reason, setReason] = React.useState("");

  function onPlanChange(v: string) {
    setPlan(v);
    start(async () => {
      try {
        await changeOrgPlan(orgId, v);
        toast.success(`Plan changed to ${v}`);
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function onSuspend() {
    start(async () => {
      try {
        await suspendOrg(orgId, reason);
        toast.success("Tenant suspended");
        setReason("");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function onUnsuspend() {
    start(async () => {
      try {
        await unsuspendOrg(orgId);
        toast.success("Tenant restored");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function onDelete() {
    const confirm = window.prompt(
      `Type the tenant name to permanently delete it: "${orgName}"`,
    );
    if (confirm !== orgName) {
      toast.error("Tenant name didn't match. Cancelled.");
      return;
    }
    start(async () => {
      try {
        await deleteOrg(orgId);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Plan</Label>
        <Select value={plan} onValueChange={onPlanChange} disabled={pending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PRO">Professional</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Granting Enterprise here bypasses Stripe billing for the tenant.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Suspension</Label>
        {suspended ? (
          <Button variant="outline" disabled={pending} onClick={onUnsuspend}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Restore tenant
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (visible to admins)"
              rows={2}
            />
            <Button variant="destructive" disabled={pending} onClick={onSuspend}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Suspend tenant
            </Button>
            <p className="text-xs text-muted-foreground">
              Suspended tenants are blocked from their workspace until restored.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label className="text-destructive">Danger zone</Label>
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
          onClick={onDelete}
        >
          Permanently delete tenant
        </Button>
        <p className="text-xs text-muted-foreground">
          This cascades to all members, inspections, incidents, etc. Cannot be undone.
        </p>
      </div>
    </div>
  );
}
