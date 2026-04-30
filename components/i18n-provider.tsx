"use client";

import * as React from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";

type Primitive = string | number | boolean | null | undefined;
export type TFn = (key: string, params?: Record<string, Primitive>) => string;

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: TFn;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function lookup(catalog: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = catalog;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: Record<string, Primitive>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
    const value = params[name];
    return value == null ? "" : String(value);
  });
}

export function I18nProvider({
  locale,
  messages,
  fallback,
  children,
}: {
  locale: Locale;
  messages: Messages;
  /** English fallback catalog used when a key is missing in the active locale. */
  fallback: Messages;
  children: React.ReactNode;
}) {
  const t = React.useCallback<TFn>(
    (key, params) => {
      const fromPrimary = lookup(messages, key);
      if (fromPrimary !== undefined) return interpolate(fromPrimary, params);
      const fromFallback = lookup(fallback, key);
      if (fromFallback !== undefined) return interpolate(fromFallback, params);
      return key;
    },
    [messages, fallback],
  );

  const value = React.useMemo(
    () => ({ locale, messages, t }),
    [locale, messages, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // We render below the provider on every page, but be defensive.
    return {
      locale: DEFAULT_LOCALE as Locale,
      messages: null as unknown as Messages,
      t: ((key: string) => key) as TFn,
    };
  }
  return ctx;
}

export function useT(): TFn {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
