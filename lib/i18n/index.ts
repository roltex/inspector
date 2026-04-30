import "server-only";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user as userTable } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from "./config";
import { enMessages } from "./messages/en";
import { kaMessages } from "./messages/ka";
import type { Messages } from "./messages/en";

export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, LOCALE_LABELS, isLocale, type Locale } from "./config";
export type { Messages } from "./messages/en";

const CATALOGS: Record<Locale, Messages> = {
  en: enMessages,
  ka: kaMessages,
};

/* --------------------------------------------------------------------------
 * Locale resolution. Order of precedence:
 *   1. user.locale (if signed in and set)
 *   2. cookie (`inspector.locale`)
 *   3. Accept-Language header
 *   4. DEFAULT_LOCALE
 * ------------------------------------------------------------------------ */

export async function getLocale(): Promise<Locale> {
  // 1. User preference (if available without throwing — DB call is allowed in
  //    server components).
  try {
    const session = await getSession();
    if (session?.user?.id) {
      const [row] = await db
        .select({ locale: userTable.locale })
        .from(userTable)
        .where(eq(userTable.id, session.user.id))
        .limit(1);
      if (row?.locale && isLocale(row.locale)) return row.locale;
    }
  } catch {
    // fall through to cookie
  }

  // 2. Cookie
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  // 3. Accept-Language
  return pickLocaleFromAcceptLanguage(headers().get("accept-language"));
}

/* --------------------------------------------------------------------------
 * `t` builder
 * ------------------------------------------------------------------------ */

type Primitive = string | number | boolean | null | undefined;

function lookup(catalog: Messages, key: string): string | undefined {
  // Walk a dotted path like "auth.signIn.title". Returns undefined if any step
  // is missing or the final value isn't a string.
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

export type TFn = (key: string, params?: Record<string, Primitive>) => string;

/** Build a translator for a specific locale. Falls back to English if a key
 *  is missing in the requested locale, and finally to the key itself. */
export function buildT(locale: Locale): TFn {
  const primary = CATALOGS[locale];
  return (key, params) => {
    const fromPrimary = lookup(primary, key);
    if (fromPrimary !== undefined) return interpolate(fromPrimary, params);
    if (locale !== DEFAULT_LOCALE) {
      const fromDefault = lookup(CATALOGS[DEFAULT_LOCALE], key);
      if (fromDefault !== undefined) return interpolate(fromDefault, params);
    }
    return key;
  };
}

/** Server component helper: read locale + return translator. */
export async function getT(): Promise<{ locale: Locale; t: TFn }> {
  const locale = await getLocale();
  return { locale, t: buildT(locale) };
}

/** Get the raw catalog (used by the client provider). */
export function getMessages(locale: Locale): Messages {
  return CATALOGS[locale];
}
