"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildNav, MOBILE_TABS } from "@/lib/nav";
import { hasFeatureSync, type FeatureKey } from "@/lib/billing/plan-types";
import type { Plan, Role } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useT } from "@/components/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";

interface AppShellProps {
  orgSlug: string;
  orgName: string;
  plan: Plan;
  role: Role;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function AppShell({
  orgSlug,
  orgName,
  plan,
  role,
  userName,
  userEmail,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const t = useT();
  const nav = React.useMemo(() => buildNav(orgSlug), [orgSlug]);
  const tabs = React.useMemo(() => MOBILE_TABS(orgSlug), [orgSlug]);

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-64 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <Image src="/icons/logo.svg" alt="" width={28} height={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{orgName}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{plan}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((group) => (
            <div key={group.labelKey} className="mb-5">
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const locked = item.feature ? !hasFeatureSync(plan, item.feature as FeatureKey) : false;
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={locked ? `/${orgSlug}/settings/billing` : item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          locked && "opacity-60",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        {locked && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                            Pro
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:pl-[16.5rem] md:pr-6">
        <div className="flex items-center gap-2 md:hidden">
          <Image src="/icons/logo.svg" alt="" width={28} height={28} />
          <span className="font-semibold">Inspector</span>
        </div>
        <div className="relative ml-auto hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("common.search")}
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4.5 w-4.5" />
          </Button>
          <LocaleSwitcher showLabel={false} />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[role]}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${orgSlug}/settings`}>{t("settings.title")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${orgSlug}/settings/billing`}>{t("nav.billing")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await authClient.signOut();
                  window.location.href = "/sign-in";
                }}
              >
                <LogOut className="h-4 w-4" />
                {t("common.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="pb-24 md:pb-8 md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <li key={tab.href} className="flex justify-center">
                <Link
                  href={tab.href}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-medium",
                    tab.primary
                      ? "relative -mt-4 w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  <tab.icon className={cn("h-5 w-5", tab.primary && "h-6 w-6")} />
                  {!tab.primary && <span>{t(tab.labelKey)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
