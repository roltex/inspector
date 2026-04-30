"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2, Eye, AlertOctagon, TriangleAlert, ThumbsUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPES = [
  { id: "SAFE", label: "Safe", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
  { id: "POSITIVE", label: "Positive", icon: ThumbsUp, color: "text-emerald-600 bg-emerald-500/10" },
  { id: "UNSAFE_CONDITION", label: "Unsafe condition", icon: AlertOctagon, color: "text-red-600 bg-red-500/10" },
  { id: "UNSAFE_ACT", label: "Unsafe act", icon: Eye, color: "text-red-600 bg-red-500/10" },
  { id: "NEAR_MISS", label: "Near miss", icon: TriangleAlert, color: "text-amber-600 bg-amber-500/10" },
] as const;

export function ObservationForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [type, setType] = React.useState<(typeof TYPES)[number]["id"]>("UNSAFE_CONDITION");
  const [severity, setSeverity] = React.useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("LOW");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("type", type);
        fd.set("severity", severity);
        start(() => action(fd));
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-all",
                type === t.id ? "border-primary ring-2 ring-primary/40" : "hover:bg-muted",
              )}
            >
              <span className={cn("rounded-lg p-2", t.color)}>
                <t.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What happened?</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe what you observed and any immediate actions you took…"
          rows={4}
          required
          minLength={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="e.g. Warehouse B, Aisle 3" />
      </div>

      <div className="space-y-2">
        <Label>Severity</Label>
        <div className="grid grid-cols-4 gap-2">
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold uppercase transition-colors",
                severity === s ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Submit observation
        </Button>
      </div>
    </form>
  );
}
