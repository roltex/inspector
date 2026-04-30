"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/components/i18n-provider";

export function LocaleSwitcher({
  variant = "ghost",
  align = "end",
  showLabel = true,
}: {
  variant?: "ghost" | "outline" | "default";
  align?: "start" | "end" | "center";
  showLabel?: boolean;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const current = LOCALE_LABELS[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-2"
          aria-label={t("language.switchTo")}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {showLabel && (
            <>
              <span className="hidden sm:inline">{current.native}</span>
              <span className="sm:hidden">{locale.toUpperCase()}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-44">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((code) => {
          const label = LOCALE_LABELS[code];
          const active = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => pick(code)}
              className="cursor-pointer"
              aria-checked={active}
              role="menuitemradio"
            >
              <span className="mr-2 text-base">{label.flag}</span>
              <span className="flex-1">{label.native}</span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
