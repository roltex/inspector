"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSettings } from "./actions";
import type { SettingsShape } from "@/lib/settings";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function SettingsForm({ initial }: { initial: SettingsShape }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [s, setS] = React.useState<SettingsShape>(initial);
  const [newFlagKey, setNewFlagKey] = React.useState("");

  function patch<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function addFlag() {
    const k = newFlagKey.trim();
    if (!k) return;
    patch("featureFlags", { ...s.featureFlags, [k]: true });
    setNewFlagKey("");
  }

  function setFlag(k: string, v: boolean) {
    patch("featureFlags", { ...s.featureFlags, [k]: v });
  }

  function removeFlag(k: string) {
    const next = { ...s.featureFlags };
    delete next[k];
    patch("featureFlags", next);
  }

  function onSave() {
    start(async () => {
      try {
        await saveSettings(s);
        toast.success("Settings saved");
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Allow new signups" hint="Public sign-up page accepts new accounts.">
            <Toggle checked={s.signupsEnabled} onChange={(v) => patch("signupsEnabled", v)} />
          </Row>
          <Row
            label="Maintenance mode"
            hint="Blocks all tenant routes. Super-admins keep access."
          >
            <Toggle checked={s.maintenanceMode} onChange={(v) => patch("maintenanceMode", v)} />
          </Row>
          {s.maintenanceMode && (
            <div className="space-y-2">
              <Label>Maintenance message</Label>
              <Textarea
                value={s.maintenanceMessage}
                onChange={(e) => patch("maintenanceMessage", e.target.value)}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding & defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>App name</Label>
              <Input value={s.appName} onChange={(e) => patch("appName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={s.appLogoUrl} onChange={(e) => patch("appLogoUrl", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Support email</Label>
              <Input
                type="email"
                value={s.supportEmail}
                onChange={(e) => patch("supportEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default plan for new tenants</Label>
              <Select
                value={s.defaultPlan}
                onValueChange={(v) => patch("defaultPlan", v as SettingsShape["defaultPlan"])}
              >
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
            </div>
            <div className="space-y-2">
              <Label>Default rate limit (req/min)</Label>
              <Input
                type="number"
                min={1}
                value={s.defaultRateLimit}
                onChange={(e) => patch("defaultRateLimit", parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {Object.keys(s.featureFlags).length === 0 && (
              <li className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                No flags yet. Add one below to control experimental features.
              </li>
            )}
            {Object.entries(s.featureFlags).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <code className="text-sm">{k}</code>
                <div className="flex items-center gap-2">
                  <Toggle checked={v} onChange={(val) => setFlag(k, val)} />
                  <button
                    type="button"
                    onClick={() => removeFlag(k)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remove ${k}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="flag-key (e.g. beta_dashboard)"
              value={newFlagKey}
              onChange={(e) => setNewFlagKey(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={addFlag}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={onSave} disabled={pending} size="lg">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
