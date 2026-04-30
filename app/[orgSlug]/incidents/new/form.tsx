"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TYPES = [
  "INJURY", "ILLNESS", "NEAR_MISS", "PROPERTY_DAMAGE", "ENVIRONMENTAL", "SECURITY", "OTHER",
] as const;

export function IncidentForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [type, setType] = React.useState<(typeof TYPES)[number]>("NEAR_MISS");
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
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Short summary" required minLength={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="occurredAt">When did it occur?</Label>
        <Input id="occurredAt" name="occurredAt" type="datetime-local" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">What happened?</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="injuredPersonName">Injured person</Label>
          <Input id="injuredPersonName" name="injuredPersonName" placeholder="Name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bodyPart">Body part</Label>
          <Input id="bodyPart" name="bodyPart" placeholder="Left hand" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lostTimeDays">Lost days</Label>
          <Input id="lostTimeDays" name="lostTimeDays" type="number" min={0} defaultValue={0} />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Submit report
        </Button>
      </div>
    </form>
  );
}
