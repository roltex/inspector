"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_LABELS } from "@/lib/rbac/permissions";
import type { Role } from "@/lib/db/schema";
import { useT } from "@/components/i18n-provider";
import { createMember } from "./actions";

function generatePassword(length = 14) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += alphabet[arr[i]! % alphabet.length];
  return pwd;
}

export function CreateMemberDialog({
  orgSlug,
  callerRole,
}: {
  orgSlug: string;
  callerRole: Role;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<Role>("INSPECTOR");
  const [password, setPassword] = React.useState(() => generatePassword());
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, start] = useTransition();

  // OWNERs can grant any role; non-OWNERs cannot grant OWNER.
  const availableRoles = callerRole === "OWNER" ? ROLES : ROLES.filter((r) => r !== "OWNER");

  function reset() {
    setRole("INSPECTOR");
    setPassword(generatePassword());
    setShowPassword(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      role,
    };
    start(async () => {
      try {
        await createMember(orgSlug, payload);
        toast.success(t("modules.members.created"));
        setOpen(false);
        reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t("modules.members.passwordCopied"));
    } catch {
      // ignore — fallback path is for the owner to type it manually
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("modules.members.new")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("modules.members.newTitle")}</DialogTitle>
          <DialogDescription>{t("modules.members.newDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("modules.members.name")}</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              placeholder={t("modules.members.namePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("modules.members.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="user@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("modules.members.password")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                title={t("modules.members.regenerate")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("modules.members.passwordHint")}{" "}
              <button
                type="button"
                onClick={copyPassword}
                className="font-medium text-primary hover:underline"
              >
                {t("modules.members.copyPassword")}
              </button>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("modules.members.role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
