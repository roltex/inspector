"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function SignUpForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/onboarding",
      });
      if (error) {
        toast.error(error.message ?? t("common.error"));
        return;
      }
      toast.success(t("auth.signIn.signedIn"));
      router.push("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("auth.signUp.name")}</Label>
        <Input id="name" name="name" placeholder="Jane Doe" required autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("auth.signUp.email")}</Label>
        <Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.signUp.password")}</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted-foreground">{t("auth.signUp.passwordHint")}</p>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("auth.signUp.submit")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        <a href="/legal/terms" className="underline">{t("marketing.footer.terms")}</a>
        {" · "}
        <a href="/legal/privacy" className="underline">{t("marketing.footer.privacy")}</a>
      </p>
    </form>
  );
}
