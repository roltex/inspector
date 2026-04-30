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
  "HOT_WORK", "CONFINED_SPACE", "WORKING_AT_HEIGHT", "ELECTRICAL",
  "EXCAVATION", "LOCKOUT_TAGOUT", "GENERAL",
] as const;

export function PermitForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [type, setType] = React.useState<(typeof TYPES)[number]>("GENERAL");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("type", type);
        start(() => action(fd));
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Grinding in workshop" />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="validFrom">Valid from</Label>
          <Input id="validFrom" name="validFrom" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validTo">Valid to</Label>
          <Input id="validTo" name="validTo" type="datetime-local" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="Workshop bay 2" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workDescription">Work description</Label>
        <Textarea id="workDescription" name="workDescription" rows={4} />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Submit for approval
        </Button>
      </div>
    </form>
  );
}
