// Client-safe locale config. No server imports here so this module can be
// imported from middleware, client components, and server components alike.

export const LOCALES = ["en", "ka"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "inspector.locale";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "🇬🇧" },
  ka: { native: "ქართული", english: "Georgian", flag: "🇬🇪" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Best-effort detection of the visitor's preferred locale from the
 *  Accept-Language header. Returns DEFAULT_LOCALE if no supported match. */
export function pickLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  // Parse "en-US,en;q=0.9,ka;q=0.8" into an ordered list of tags.
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.split("=")[1]) : 1;
      return { tag: tag?.toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
