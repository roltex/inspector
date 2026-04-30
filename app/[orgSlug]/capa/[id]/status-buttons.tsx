"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateActionStatus } from "../actions";

const STATUSES = ["OPEN", "IN_PROGRESS", "UNDER_REVIEW", "CLOSED"];

export function StatusButtons({
  orgSlug,
  id,
  status,
}: {
  orgSlug: string;
  id: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <Button
          key={s}
          variant={status === s ? "default" : "outline"}
          size="sm"
          disabled={pending}
          onClick={() => {
            start(async () => {
              await updateActionStatus(orgSlug, id, s);
              toast.success(`Marked as ${s.replace("_", " ").toLowerCase()}`);
            });
          }}
        >
          {s.replace("_", " ")}
        </Button>
      ))}
    </div>
  );
}
