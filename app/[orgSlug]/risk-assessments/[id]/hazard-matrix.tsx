"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { saveHazards } from "../actions";

interface Hazard {
  id: string;
  hazard: string;
  whoAtRisk?: string;
  likelihood: number;
  severity: number;
  initialRisk: number;
  controls: string[];
  residualLikelihood: number;
  residualSeverity: number;
  residualRisk: number;
}

function riskBand(n: number) {
  if (n >= 15) return { label: "Extreme", class: "bg-red-600 text-white" };
  if (n >= 10) return { label: "High", class: "bg-orange-500 text-white" };
  if (n >= 5) return { label: "Medium", class: "bg-yellow-400 text-black" };
  return { label: "Low", class: "bg-emerald-500 text-white" };
}

export function HazardMatrix({
  orgSlug,
  id,
  initial,
}: {
  orgSlug: string;
  id: string;
  initial: Hazard[];
}) {
  const [hazards, setHazards] = React.useState<Hazard[]>(initial.length ? initial : []);
  const [pending, start] = useTransition();

  function addHazard() {
    setHazards((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        hazard: "",
        whoAtRisk: "",
        likelihood: 3,
        severity: 3,
        initialRisk: 9,
        controls: [],
        residualLikelihood: 2,
        residualSeverity: 2,
        residualRisk: 4,
      },
    ]);
  }

  function update(i: number, patch: Partial<Hazard>) {
    setHazards((prev) =>
      prev.map((h, j) => {
        if (j !== i) return h;
        const next = { ...h, ...patch };
        next.initialRisk = next.likelihood * next.severity;
        next.residualRisk = next.residualLikelihood * next.residualSeverity;
        return next;
      }),
    );
  }

  function remove(i: number) {
    setHazards((prev) => prev.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-4">
      {hazards.map((h, i) => {
        const initial = riskBand(h.initialRisk);
        const residual = riskBand(h.residualRisk);
        return (
          <div key={h.id} className="space-y-3 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Hazard</Label>
                  <Input
                    value={h.hazard}
                    onChange={(e) => update(i, { hazard: e.target.value })}
                    placeholder="e.g. Falling objects from racking"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Who's at risk</Label>
                  <Input
                    value={h.whoAtRisk ?? ""}
                    onChange={(e) => update(i, { whoAtRisk: e.target.value })}
                    placeholder="e.g. Warehouse operators"
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreBox
                label="Initial risk"
                likelihood={h.likelihood}
                severity={h.severity}
                total={h.initialRisk}
                band={initial}
                onLikelihood={(v) => update(i, { likelihood: v })}
                onSeverity={(v) => update(i, { severity: v })}
              />
              <ScoreBox
                label="Residual risk"
                likelihood={h.residualLikelihood}
                severity={h.residualSeverity}
                total={h.residualRisk}
                band={residual}
                onLikelihood={(v) => update(i, { residualLikelihood: v })}
                onSeverity={(v) => update(i, { residualSeverity: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Controls (one per line)</Label>
              <Textarea
                rows={3}
                value={h.controls.join("\n")}
                onChange={(e) => update(i, { controls: e.target.value.split("\n").filter(Boolean) })}
              />
            </div>
          </div>
        );
      })}

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={addHazard}>
          <Plus className="h-4 w-4" /> Add hazard
        </Button>
        <Button
          disabled={pending || hazards.length === 0}
          onClick={() => {
            start(async () => {
              await saveHazards(orgSlug, id, hazards);
              toast.success("Saved");
            });
          }}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save assessment
        </Button>
      </div>
    </div>
  );
}

function ScoreBox({
  label,
  likelihood,
  severity,
  total,
  band,
  onLikelihood,
  onSeverity,
}: {
  label: string;
  likelihood: number;
  severity: number;
  total: number;
  band: ReturnType<typeof riskBand>;
  onLikelihood: (v: number) => void;
  onSeverity: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", band.class)}>
          {total} · {band.label}
        </span>
      </div>
      <Scale label="Likelihood" value={likelihood} onChange={onLikelihood} />
      <Scale label="Severity" value={severity} onChange={onSeverity} />
    </div>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{value}</span>
      </div>
      <div className="mt-1 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-8 rounded-md text-xs font-semibold transition-colors",
              value >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
