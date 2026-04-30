import Link from "next/link";
import { Github, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getT } from "@/lib/i18n";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Inspector</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/#features" className="text-muted-foreground hover:text-foreground">{t("marketing.nav.features")}</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">{t("marketing.nav.pricing")}</Link>
            <Link href="/#faq" className="text-muted-foreground hover:text-foreground">FAQ</Link>
            <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">{t("marketing.footer.privacy")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/sign-in">{t("marketing.nav.signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">{t("common.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t bg-muted/30">
        <div className="container grid gap-10 py-14 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-semibold">Inspector</span>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("common.appTagline")}
            </p>
          </div>
          <FooterCol title={t("marketing.footer.product")} items={[
            [t("marketing.nav.features"), "/#features"],
            [t("marketing.nav.pricing"), "/pricing"],
            ["Modules", "/#modules"],
            [t("marketing.nav.signIn"), "/sign-in"],
          ]} />
          <FooterCol title={t("marketing.footer.company")} items={[
            [t("marketing.footer.privacy"), "/legal/privacy"],
            [t("marketing.footer.terms"), "/legal/terms"],
            ["Status", "/#"],
            ["Changelog", "/#"],
          ]} />
        </div>
        <div className="border-t">
          <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
            <p>{t("marketing.footer.copy", { year: new Date().getFullYear() })}</p>
            <div className="flex items-center gap-3">
              <Link href="https://github.com" className="inline-flex items-center gap-1 hover:text-foreground">
                <Github className="h-3.5 w-3.5" /> GitHub
              </Link>
              <Link href="/legal/privacy" className="hover:text-foreground">{t("marketing.footer.privacy")}</Link>
              <Link href="/legal/terms" className="hover:text-foreground">{t("marketing.footer.terms")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">{title}</p>
      <ul className="space-y-2">
        {items.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
