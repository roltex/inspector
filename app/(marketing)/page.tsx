import Link from "next/link";
import {
  ArrowRight, ClipboardCheck, Eye, AlertTriangle, ListChecks, ShieldAlert,
  GraduationCap, FolderLock, FlaskConical, HardHat, FileSignature, ScrollText,
  Users2, BarChart3, Smartphone, Wifi, QrCode, Camera, Bell, Lock, Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT, type TFn } from "@/lib/i18n";

export default async function LandingPage() {
  const { t } = await getT();
  return (
    <>
      <Hero t={t} />
      <LogoCloud t={t} />
      <Modules t={t} />
      <BuiltForField t={t} />
      <Preview t={t} />
      <Pricing t={t} />
      <Testimonials t={t} />
      <Faq t={t} />
      <FinalCta t={t} />
    </>
  );
}

function Hero({ t }: { t: TFn }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mesh-bg absolute inset-0 -z-10" />
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-5 gap-1.5 border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {t("landing.hero.badge")}
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            {t("landing.hero.titleA")}{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-sky-500 bg-clip-text text-transparent">
              {t("landing.hero.titleB")}
            </span>
          </h1>
          <p className="mt-5 text-pretty text-lg text-muted-foreground md:text-xl">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/sign-up">
                {t("landing.hero.startFree")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#modules">{t("landing.hero.exploreModules")}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("landing.hero.disclaimer")}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative rounded-3xl border bg-card p-2 shadow-2xl shadow-primary/10">
            <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-950/30 dark:via-background dark:to-sky-950/30">
              <DashboardMock t={t} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMock({ t }: { t: TFn }) {
  return (
    <div className="grid gap-3 p-4 sm:p-6 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <MockStat label={t("nav.inspections")} value="248" trend="+12%" />
          <MockStat label="Open CAPAs" value="14" trend="-3" tone="warning" />
          <MockStat label={t("nav.observations")} value="1,294" trend="+8%" />
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Trends · Last 90 days</p>
            <span className="text-xs text-muted-foreground">Observations vs Incidents</span>
          </div>
          <svg viewBox="0 0 400 110" className="h-28 w-full">
            <defs>
              <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 84% 35%)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(160 84% 35%)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 80 L40 60 L80 65 L120 40 L160 50 L200 30 L240 35 L280 20 L320 25 L360 15 L400 25 L400 110 L0 110 Z" fill="url(#g1)" />
            <path d="M0 80 L40 60 L80 65 L120 40 L160 50 L200 30 L240 35 L280 20 L320 25 L360 15 L400 25" fill="none" stroke="hsl(160 84% 35%)" strokeWidth="2" />
            <path d="M0 95 L40 92 L80 90 L120 92 L160 88 L200 90 L240 86 L280 88 L320 82 L360 85 L400 80 L400 110 L0 110 Z" fill="url(#g2)" />
            <path d="M0 95 L40 92 L80 90 L120 92 L160 88 L200 90 L240 86 L280 88 L320 82 L360 85 L400 80" fill="none" stroke="hsl(0 72% 51%)" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <div className="grid gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Priority actions</p>
          <ul className="space-y-2.5 text-sm">
            {[
              ["Replace damaged guardrail", "Critical"],
              ["Investigate near miss #218", "High"],
              ["Schedule confined space drill", "Medium"],
              ["Renew SDS for solvent X", "Low"],
            ].map(([title, p]) => (
              <li key={title} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  p === "Critical" ? "bg-destructive" :
                  p === "High" ? "bg-warning" :
                  p === "Medium" ? "bg-sky-500" : "bg-muted-foreground"
                }`} />
                <div className="min-w-0">
                  <p className="truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">{p} priority</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-sm font-medium">TRIR · YTD</p>
          <p className="text-3xl font-semibold">1.42</p>
          <p className="text-xs text-muted-foreground">Industry avg 2.7</p>
        </div>
      </div>
    </div>
  );
}

function MockStat({
  label, value, trend, tone = "ok",
}: { label: string; value: string; trend: string; tone?: "ok" | "warning" }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className={`mt-0.5 text-xs ${tone === "warning" ? "text-warning" : "text-primary"}`}>{trend}</p>
    </div>
  );
}

function LogoCloud({ t }: { t: TFn }) {
  return (
    <section className="border-y bg-muted/20">
      <div className="container py-10">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("landing.logos")}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 opacity-70 sm:grid-cols-3 md:grid-cols-6">
          {["NorthBuild", "Helix Energy", "Atlas Mfg.", "BluePort", "Ironworks", "GreenGrid"].map((n) => (
            <div key={n} className="text-center text-sm font-semibold tracking-tight text-muted-foreground">
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MODULE_KEYS = [
  { icon: ClipboardCheck, key: "inspections" as const },
  { icon: Eye, key: "observations" as const },
  { icon: AlertTriangle, key: "incidents" as const },
  { icon: ListChecks, key: "capa" as const },
  { icon: ShieldAlert, key: "risk" as const },
  { icon: GraduationCap, key: "training" as const },
  { icon: FolderLock, key: "documents" as const },
  { icon: FlaskConical, key: "chemicals" as const },
  { icon: HardHat, key: "ppe" as const },
  { icon: FileSignature, key: "permits" as const },
  { icon: ScrollText, key: "compliance" as const },
  { icon: Users2, key: "contractors" as const },
  { icon: BarChart3, key: "analytics" as const },
];

function Modules({ t }: { t: TFn }) {
  return (
    <section id="modules" className="container py-20 md:py-28">
      <SectionHead
        eyebrow={t("landing.modules.eyebrow")}
        title={t("landing.modules.title")}
        subtitle={t("landing.modules.subtitle")}
      />
      <div id="features" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULE_KEYS.map((m) => (
          <Card key={m.key} className="group transition hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <m.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold">{t(`landing.modules.items.${m.key}.title`)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`landing.modules.items.${m.key}.body`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

const FIELD_ITEMS = [
  { icon: Wifi, key: "offline" as const },
  { icon: Smartphone, key: "pwa" as const },
  { icon: Camera, key: "photo" as const },
  { icon: QrCode, key: "qr" as const },
  { icon: Bell, key: "reminders" as const },
  { icon: Lock, key: "security" as const },
];

function BuiltForField({ t }: { t: TFn }) {
  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <SectionHead
          eyebrow={t("landing.field.eyebrow")}
          title={t("landing.field.title")}
          subtitle={t("landing.field.subtitle")}
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELD_ITEMS.map((it) => (
            <div key={it.key} className="rounded-2xl border bg-card p-5">
              <it.icon className="h-6 w-6 text-primary" />
              <p className="mt-3 font-semibold">{t(`landing.field.items.${it.key}.title`)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`landing.field.items.${it.key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Preview({ t }: { t: TFn }) {
  const bullets: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
  return (
    <section className="container py-20 md:py-28">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <SectionHead
            eyebrow={t("landing.preview.eyebrow")}
            title={t("landing.preview.title")}
            subtitle={t("landing.preview.subtitle")}
            align="left"
          />
          <ul className="mt-6 space-y-3 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-primary" /> {t(`landing.preview.bullets.${b}`)}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Button asChild size="lg">
              <Link href="/sign-up">{t("landing.preview.cta")} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
        <div className="relative rounded-3xl border bg-card p-2 shadow-xl">
          <div className="overflow-hidden rounded-2xl border bg-muted/30">
            <DashboardMock t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ t }: { t: TFn }) {
  const tiers: Array<{
    name: string;
    price: string;
    descKey: string;
    items: string[];
    cta: string;
    href: string;
    popular?: boolean;
  }> = [
    {
      name: "Free",
      price: "$0",
      descKey: "For small teams getting started.",
      items: [
        `5 ${t("nav.members").toLowerCase()}`,
        t("nav.inspections"),
        t("nav.observations"),
        "Mobile PWA",
      ],
      cta: t("common.getStarted"),
      href: "/sign-up",
    },
    {
      name: "Starter",
      price: "$29",
      descKey: "Replace paper and spreadsheets.",
      items: [`25 ${t("nav.members").toLowerCase()}`, `${t("nav.incidents")} & CAPA`, t("nav.documents"), t("nav.analytics")],
      cta: t("common.getStarted"),
      href: "/sign-up",
    },
    {
      name: "Professional",
      price: "$99",
      popular: true,
      descKey: "The full EHS suite.",
      items: [`100 ${t("nav.members").toLowerCase()}`, "All 13 modules", t("nav.analytics"), "Web Push & reminders"],
      cta: t("common.getStarted"),
      href: "/sign-up",
    },
    {
      name: "Enterprise",
      price: t("marketing.pricing.custom"),
      descKey: "Security, SSO and scale.",
      items: [`Unlimited ${t("nav.members").toLowerCase()}`, "SSO (SAML/OIDC)", "Audit export", "SLA & DPA"],
      cta: t("common.contactSales"),
      href: "mailto:sales@inspector.app",
    },
  ];
  return (
    <section id="pricing" className="container py-20 md:py-28">
      <SectionHead
        eyebrow={t("landing.pricing.eyebrow")}
        title={t("landing.pricing.title")}
        subtitle={t("landing.pricing.subtitle")}
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((p) => (
          <Card key={p.name} className={p.popular ? "border-primary ring-1 ring-primary/20" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                {p.popular && <Badge>{t("landing.pricing.mostPopular")}</Badge>}
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {p.price}
                {p.price.startsWith("$") && p.price !== "$0" && (
                  <span className="text-base text-muted-foreground"> {t("landing.pricing.perMonth")}</span>
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{p.descKey}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> {i}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.popular ? "default" : "outline"}>
                <Link href={p.href}>{p.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("landing.pricing.footnote")}
      </p>
    </section>
  );
}

function Testimonials({ t }: { t: TFn }) {
  const items: Array<"a" | "b" | "c"> = ["a", "b", "c"];
  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <SectionHead eyebrow={t("landing.testimonials.eyebrow")} title={t("landing.testimonials.title")} />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {items.map((k) => (
            <Card key={k}>
              <CardContent className="p-6">
                <p className="text-pretty text-base">&ldquo;{t(`landing.testimonials.items.${k}.quote`)}&rdquo;</p>
                <div className="mt-5">
                  <p className="text-sm font-semibold">{t(`landing.testimonials.items.${k}.who`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`landing.testimonials.items.${k}.role`)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ t }: { t: TFn }) {
  const keys: Array<"offline" | "security" | "selfHost" | "sites" | "billing"> = [
    "offline", "security", "selfHost", "sites", "billing",
  ];
  return (
    <section id="faq" className="container py-20 md:py-28">
      <SectionHead eyebrow={t("landing.faq.eyebrow")} title={t("landing.faq.title")} />
      <div className="mx-auto mt-10 max-w-3xl divide-y rounded-2xl border bg-card">
        {keys.map((k) => (
          <details key={k} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-left font-medium">
              {t(`landing.faq.items.${k}.q`)}
              <span className="grid h-7 w-7 place-items-center rounded-full border text-muted-foreground transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{t(`landing.faq.items.${k}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ t }: { t: TFn }) {
  return (
    <section className="container pb-24">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-emerald-500/10 to-sky-500/10 p-10 text-center md:p-16">
        <div className="mesh-bg absolute inset-0 -z-10" />
        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {t("landing.finalCta.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {t("landing.finalCta.subtitle")}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/sign-up">{t("landing.hero.startFree")} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">{t("landing.finalCta.seePricing")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SectionHead({
  eyebrow, title, subtitle, align = "center",
}: { eyebrow?: string; title: string; subtitle?: string; align?: "left" | "center" }) {
  return (
    <div className={align === "left" ? "" : "mx-auto max-w-2xl text-center"}>
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-wider text-primary">{eyebrow}</p>
      )}
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-pretty text-muted-foreground md:text-lg">{subtitle}</p>}
    </div>
  );
}
