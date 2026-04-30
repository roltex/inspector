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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function ComplianceDialogs({
  regs,
  onAddReg,
  onAddReq,
}: {
  regs: { id: string; title: string }[];
  onAddReg: (fd: FormData) => Promise<void>;
  onAddReq: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SimpleDialog title="Add regulation" trigger="Add regulation" onSubmit={onAddReg}>
        <Field name="code" label="Code (optional)" />
        <Field name="title" label="Title" required />
        <Field name="jurisdiction" label="Jurisdiction" />
        <Field name="category" label="Category" />
      </SimpleDialog>
      <SimpleDialog title="Add requirement" trigger="Add requirement" onSubmit={onAddReq}>
        <Field name="title" label="Requirement" required />
        <div className="space-y-2">
          <Label htmlFor="regulationId">Regulation</Label>
          <Select name="regulationId">
            <SelectTrigger><SelectValue placeholder="Pick a regulation (optional)" /></SelectTrigger>
            <SelectContent>
              {regs.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field name="dueDate" label="Due date" type="date" />
      </SimpleDialog>
    </div>
  );
}

function Field({
  name, label, type, required,
}: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type ?? "text"} required={required} />
    </div>
  );
}

function SimpleDialog({
  title,
  trigger,
  onSubmit,
  children,
}: {
  title: string;
  trigger: string;
  onSubmit: (fd: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="h-4 w-4" /> {trigger}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              await onSubmit(fd);
              setOpen(false);
            });
          }}
          className="space-y-4"
        >
          {children}
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
