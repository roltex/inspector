import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function formatDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", opts ?? { dateStyle: "medium" }).format(date);
}

export function formatRelative(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(-diff), "second");
  if (abs < 3600) return rtf.format(Math.round(-diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(-diff / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(-diff / 86_400), "day");
  if (abs < 31_536_000) return rtf.format(Math.round(-diff / 2_592_000), "month");
  return rtf.format(Math.round(-diff / 31_536_000), "year");
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}
