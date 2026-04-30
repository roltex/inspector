"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

export function ChemDialog({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg"><Plus className="h-4 w-4" /> New chemical</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New chemical</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => { await action(fd); setOpen(false); });
          }}
          className="space-y-3"
        >
          <Row label="Name" name="name" required placeholder="Sodium hydroxide" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="CAS Number" name="casNumber" />
            <Row label="Manufacturer" name="manufacturer" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="Hazard class" name="hazardClass" placeholder="Corrosive" />
            <Row label="Signal word" name="signalWord" placeholder="Danger" />
          </div>
          <Row label="Storage location" name="location" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="Quantity" name="quantity" type="number" />
            <Row label="Unit" name="unit" placeholder="L, kg, g" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label, name, placeholder, type, required,
}: { label: string; name: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} type={type ?? "text"} required={required} />
    </div>
  );
}
