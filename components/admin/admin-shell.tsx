"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ScrollText,
  Settings,
  Activity,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Tags,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useT } from "@/components/i18n-provider";

const NAV = [
  { href: "/admin", labelKey: "admin.nav.overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", labelKey: "admin.nav.tenants", icon: Building2 },
  { href: "/admin/users", labelKey: "admin.nav.users", icon: Users },
  { href: "/admin/billing", labelKey: "admin.nav.billing", icon: CreditCard },
  { href: "/admin/plans", labelKey: "admin.nav.plans", icon: Tags },
  {
    href: "/admin/inspection-item-templates",
    labelKey: "admin.nav.inspectionItemTemplates",
    icon: Bookmark,
  },
  { href: "/admin/audit", labelKey: "admin.nav.auditLog", icon: ScrollText },
  { href: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings },
  { href: "/admin/health", labelKey: "admin.nav.health", icon: Activity },
];

export function AdminShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useT();
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-muted/20">
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-64 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 truncate">
            <div className="font-display text-sm font-semibold leading-tight">{t("admin.shell.platformAdmin")}</div>
            <div className="truncate text-[11px] uppercase tracking-wide text-destructive">
              {t("admin.shell.privilegedArea")}
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="space-y-1 border-t p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("admin.shell.backToApp")}
          </Link>
          <form action="/admin/sign-out" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("admin.shell.endSession")}
            </button>
          </form>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-destructive">
            <ShieldCheck className="h-4 w-4" />
            {t("admin.shell.platformAdmin")}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <form action="/admin/sign-out" method="post" className="hidden md:block">
              <button
                type="submit"
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                title={t("admin.shell.endSession")}
              >
                {t("admin.shell.endSession")}
              </button>
            </form>
            <LocaleSwitcher showLabel={false} />
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-destructive/10 text-destructive">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-right text-xs md:block">
              <div className="font-medium">{userName}</div>
              <div className="text-muted-foreground">{userEmail}</div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="md:hidden mb-4 -mx-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-1">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
                      active
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
