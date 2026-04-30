import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSetting } from "@/lib/db/schema";

export type SettingsShape = {
  signupsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultPlan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  appName: string;
  appLogoUrl: string;
  supportEmail: string;
  defaultRateLimit: number;
  featureFlags: Record<string, boolean>;
};

export const DEFAULT_SETTINGS: SettingsShape = {
  signupsEnabled: true,
  maintenanceMode: false,
  maintenanceMessage:
    "Inspector is currently undergoing scheduled maintenance. We'll be back shortly.",
  defaultPlan: "FREE",
  appName: "Inspector",
  appLogoUrl: "/icons/logo.svg",
  supportEmail: "support@inspector.app",
  defaultRateLimit: 60,
  featureFlags: {},
};

const TTL_MS = 60_000;
let cache: { value: SettingsShape; expiresAt: number } | null = null;

async function loadFromDb(): Promise<SettingsShape> {
  try {
    const rows = await db
      .select({ key: appSetting.key, value: appSetting.value })
      .from(appSetting);
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      if (r.value !== null && r.value !== undefined) merged[r.key] = r.value;
    }
    return merged as SettingsShape;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getSettings(): Promise<SettingsShape> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  const value = await loadFromDb();
  cache = { value, expiresAt: now + TTL_MS };
  return value;
}

export async function getSetting<K extends keyof SettingsShape>(key: K): Promise<SettingsShape[K]> {
  const all = await getSettings();
  return all[key];
}

export async function setSetting<K extends keyof SettingsShape>(
  key: K,
  value: SettingsShape[K],
  updatedBy: string,
) {
  await db
    .insert(appSetting)
    .values({ key, value: value as unknown as object, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSetting.key,
      set: { value: value as unknown as object, updatedBy, updatedAt: new Date() },
    });
  invalidateSettingsCache();
}

export function invalidateSettingsCache() {
  cache = null;
}
