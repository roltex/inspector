"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";

export function SignInForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = React.useState(false);
  const [magicLoading, setMagicLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/onboarding",
      });
      if (error) {
        toast.error(error.message ?? t("auth.signIn.failed"));
        return;
      }
      toast.success(t("auth.signIn.signedIn"));
      router.push("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onMagic() {
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value;
    if (!email) {
      toast.error(t("auth.signIn.enterEmailFirst"));
      return;
    }
    setMagicLoading(true);
    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/onboarding",
      });
      if (error) toast.error(error.message ?? t("common.error"));
      else toast.success(t("auth.signIn.magicLinkSent"));
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("auth.signIn.email")}</Label>
        <Input id="email" name="email" type="email" placeholder={t("auth.signIn.emailPlaceholder")} required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.signIn.password")}</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" minLength={8} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("auth.signIn.submit")}
      </Button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-xs uppercase text-muted-foreground">{t("common.or")}</span>
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" size="lg" onClick={onMagic} disabled={magicLoading}>
        {magicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {t("auth.signIn.magicLink")}
      </Button>
    </form>
  );
}
