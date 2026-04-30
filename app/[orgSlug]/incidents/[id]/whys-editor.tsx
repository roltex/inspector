"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWhys } from "../actions";

export function WhysEditor({
  orgSlug,
  incidentId,
  initial,
}: {
  orgSlug: string;
  incidentId: string;
  initial: string[];
}) {
  const [whys, setWhys] = React.useState(() =>
    Array.from({ length: 5 }, (_, i) => initial[i] ?? ""),
  );
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {whys.map((w, i) => (
        <div key={i} className="space-y-1.5">
          <Label htmlFor={`why-${i}`} className="text-xs uppercase tracking-wide text-muted-foreground">
            Why #{i + 1}
          </Label>
          <Input
            id={`why-${i}`}
            value={w}
            onChange={(e) =>
              setWhys((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
            }
            placeholder={i === 0 ? "Why did this happen?" : "Why did that happen?"}
          />
        </div>
      ))}
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={pending}
          onClick={() => {
            start(async () => {
              await saveWhys(orgSlug, incidentId, whys);
              toast.success("Root cause saved");
            });
          }}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save analysis
        </Button>
      </div>
    </div>
  );
}
