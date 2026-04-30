import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  icon?: React.ReactNode;
  className?: string;
  hint?: string;
}

export function StatCard({ label, value, delta, icon, className, hint }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div>
        )}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            delta.positive
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {delta.positive ? "↑" : "↓"} {delta.value}
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl"
      />
    </div>
  );
}
