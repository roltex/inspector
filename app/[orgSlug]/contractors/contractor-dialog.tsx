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

export function ContractorDialog({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg"><Plus className="h-4 w-4" /> New contractor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New contractor</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => { await action(fd); setOpen(false); });
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input id="contactPhone" name="contactPhone" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceExpiresAt">Insurance expires</Label>
            <Input id="insuranceExpiresAt" name="insuranceExpiresAt" type="date" />
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
