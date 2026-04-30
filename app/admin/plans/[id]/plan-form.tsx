"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
} from "@/lib/billing/plan-types";
import type { Plan } from "@/lib/db/schema";
import { savePlanAction, type SavePlanState } from "./actions";

const INITIAL: SavePlanState = { ok: false };

interface PlanFormData {
  id: Plan;
  name: string;
  tagline: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  userLimit: number;
  storageLimitGb: number;
  features: FeatureKey[];
  highlights: string[];
  cta: string;
  popular: boolean;
  isPublic: boolean;
  isArchived: boolean;
  displayOrder: number;
  stripeMonthlyConfigured: boolean;
  stripeYearlyConfigured: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  name: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
      {/* Hidden checkbox so the value reaches the server action via FormData. */}
      <input type="checkbox" name={name} checked={checked} onChange={() => {}} className="sr-only" />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-32">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save plan
    </Button>
  );
}

export function PlanForm({ plan }: { plan: PlanFormData }) {
  const [state, formAction] = useFormState(savePlanAction, INITIAL);

  // Local UI state for dynamic lists + toggles. The form is uncontrolled for
  // text fields (uses FormData on submit) and controlled for the toggles +
  // arrays so we can render add/remove UI.
  const [features, setFeatures] = React.useState<FeatureKey[]>(plan.features);
  const [highlights, setHighlights] = React.useState<string[]>(plan.highlights);
  const [popular, setPopular] = React.useState(plan.popular);
  const [isPublic, setIsPublic] = React.useState(plan.isPublic);
  const [isArchived, setIsArchived] = React.useState(plan.isArchived);
  const [priceMonthly, setPriceMonthly] = React.useState<string>(
    plan.priceMonthly == null ? "" : String(plan.priceMonthly),
  );
  const [priceYearly, setPriceYearly] = React.useState<string>(
    plan.priceYearly == null ? "" : String(plan.priceYearly),
  );

  const errs = !state.ok ? state.fieldErrors ?? {} : {};

  function toggleFeature(key: FeatureKey) {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function addHighlight() {
    setHighlights((p) => [...p, ""]);
  }
  function setHighlight(i: number, v: string) {
    setHighlights((p) => p.map((h, idx) => (idx === i ? v : h)));
  }
  function removeHighlight(i: number) {
    setHighlights((p) => p.filter((_, idx) => idx !== i));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={plan.id} />

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
          <CardDescription>Shown on the marketing pricing page and in workspace billing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" defaultValue={plan.name} required maxLength={60} />
              <FieldError message={errs.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cta">Call to action</Label>
              <Input
                id="cta"
                name="cta"
                defaultValue={plan.cta}
                maxLength={60}
                placeholder="Get started"
              />
              <FieldError message={errs.cta} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={plan.tagline} maxLength={180} />
            <FieldError message={errs.tagline} />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Display pricing</CardTitle>
          <CardDescription>
            Leave blank to show <span className="font-medium">"Custom"</span>. Stripe is the source of truth for the actual amount charged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="priceMonthly">Monthly</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="priceMonthly"
                  name="priceMonthly"
                  inputMode="numeric"
                  className="pl-7"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Stripe monthly price ID:{" "}
                {plan.stripeMonthlyConfigured ? (
                  <span className="text-emerald-600">configured</span>
                ) : (
                  <span className="text-muted-foreground">not set</span>
                )}
              </p>
              <FieldError message={errs.priceMonthly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priceYearly">Yearly</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="priceYearly"
                  name="priceYearly"
                  inputMode="numeric"
                  className="pl-7"
                  value={priceYearly}
                  onChange={(e) => setPriceYearly(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Stripe yearly price ID:{" "}
                {plan.stripeYearlyConfigured ? (
                  <span className="text-emerald-600">configured</span>
                ) : (
                  <span className="text-muted-foreground">not set</span>
                )}
              </p>
              <FieldError message={errs.priceYearly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={plan.currency}
                maxLength={3}
                className="uppercase"
              />
              <FieldError message={errs.currency} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
          <CardDescription>
            Soft limits used for display and feature gating. Hard enforcement happens server-side based on these values.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="userLimit">Users</Label>
            <Input
              id="userLimit"
              name="userLimit"
              type="number"
              min={1}
              defaultValue={plan.userLimit}
              required
            />
            <FieldError message={errs.userLimit} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storageLimitGb">Storage (GB)</Label>
            <Input
              id="storageLimitGb"
              name="storageLimitGb"
              type="number"
              min={0}
              defaultValue={plan.storageLimitGb}
              required
            />
            <FieldError message={errs.storageLimitGb} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input
              id="displayOrder"
              name="displayOrder"
              type="number"
              min={0}
              defaultValue={plan.displayOrder}
              required
            />
            <FieldError message={errs.displayOrder} />
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Included features</CardTitle>
          <CardDescription>
            Selected features unlock their corresponding modules and navigation links for tenants on this plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key) => {
              const checked = features.includes(key);
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeature(key)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="flex-1">{FEATURE_LABELS[key]}</span>
                </label>
              );
            })}
          </div>
          {features.map((f) => (
            <input key={f} type="hidden" name="features" value={f} />
          ))}
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing highlights</CardTitle>
          <CardDescription>Bullet points shown under the price on the pricing page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {highlights.length === 0 && (
            <p className="text-xs text-muted-foreground">No highlights yet.</p>
          )}
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={h}
                onChange={(e) => setHighlight(i, e.target.value)}
                placeholder="e.g. Up to 25 users"
                maxLength={200}
              />
              <input type="hidden" name="highlights" value={h} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeHighlight(i)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addHighlight}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add highlight
          </Button>
        </CardContent>
      </Card>

      {/* Visibility & status */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility & status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Toggle
            name="isPublic"
            checked={isPublic}
            onChange={setIsPublic}
            label="Public"
            hint="Show this plan on the public /pricing page."
          />
          <Toggle
            name="popular"
            checked={popular}
            onChange={setPopular}
            label="Mark as popular"
            hint="Highlight as the recommended tier (only one allowed)."
          />
          <Toggle
            name="isArchived"
            checked={isArchived}
            onChange={setIsArchived}
            label="Archive"
            hint="Hide everywhere, including from existing customers' upgrade pickers."
          />
        </CardContent>
      </Card>

      {!state.ok && state.error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {state.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
