"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setSetting, type SettingsShape, invalidateSettingsCache } from "@/lib/settings";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

const schema = z.object({
  signupsEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(2000),
  defaultPlan: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]),
  appName: z.string().min(1).max(120),
  appLogoUrl: z.string().max(2048),
  supportEmail: z.string().email().or(z.literal("")),
  defaultRateLimit: z.number().int().min(1).max(10_000),
  featureFlags: z.record(z.boolean()),
});

export async function saveSettings(input: SettingsShape) {
  const admin = await requireSuperAdmin();
  const parsed = schema.parse(input);

  for (const key of Object.keys(parsed) as Array<keyof SettingsShape>) {
    await setSetting(key, parsed[key] as never, admin.id);
  }
  invalidateSettingsCache();
  await recordAudit({
    userId: admin.id,
    action: "admin.settings.update",
    data: parsed,
  });
  revalidatePath("/admin/settings");
}
