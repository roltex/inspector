"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";
import { adminSignInAction, type AdminSignInState } from "./actions";

const INITIAL: AdminSignInState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t("auth.admin.submit")}
    </Button>
  );
}

export function AdminSignInForm({ next }: { next: string }) {
  const t = useT();
  const [state, formAction] = useFormState(adminSignInAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.admin.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          minLength={1}
        />
      </div>
      {!state.ok && state.error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      <Submit />
    </form>
  );
}
