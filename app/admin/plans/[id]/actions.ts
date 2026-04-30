"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type Plan } from "@/lib/db/schema";
import { PLAN_ORDER, FEATURE_KEYS } from "@/lib/billing/plan-types";
import { planUpdateSchema, updatePlanDefinition, setPlanPopular } from "@/lib/billing/plan-store";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";

const planIdSchema = z.enum(PLAN_ORDER as [Plan, ...Plan[]]);

export type SavePlanState =
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | { ok: true; message: string };

const INITIAL: SavePlanState = { ok: false };

function nonEmpty(values: FormDataEntryValue[]): string[] {
  return values.map((v) => String(v).trim()).filter(Boolean);
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s.toLowerCase() === "custom") return null;
  const n = Number(s.replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function savePlanAction(
  _prev: SavePlanState,
  formData: FormData,
): Promise<SavePlanState> {
  const admin = await requireSuperAdmin();

  const planId = planIdSchema.safeParse(formData.get("id"));
  if (!planId.success) return { ok: false, error: "Unknown plan." };

  const features = nonEmpty(formData.getAll("features")).filter((f) =>
    (FEATURE_KEYS as string[]).includes(f),
  );
  const highlights = nonEmpty(formData.getAll("highlights"));

  const parsed = planUpdateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    priceMonthly: intOrNull(formData.get("priceMonthly")),
    priceYearly: intOrNull(formData.get("priceYearly")),
    currency: String(formData.get("currency") ?? "USD").toUpperCase(),
    userLimit: Number(formData.get("userLimit") ?? 0),
    storageLimitGb: Number(formData.get("storageLimitGb") ?? 0),
    features,
    highlights,
    cta: (formData.get("cta") ? String(formData.get("cta")) : null) || null,
    popular: formData.get("popular") === "on",
    isPublic: formData.get("isPublic") === "on",
    isArchived: formData.get("isArchived") === "on",
    displayOrder: Number(formData.get("displayOrder") ?? 0),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  await updatePlanDefinition(planId.data, parsed.data, admin.id);
  if (parsed.data.popular) {
    await setPlanPopular(planId.data, true, admin.id);
  }

  await recordAudit({
    userId: admin.id,
    action: "admin.plan.update",
    entityType: "plan",
    entityId: planId.data,
    data: {
      name: parsed.data.name,
      priceMonthly: parsed.data.priceMonthly,
      priceYearly: parsed.data.priceYearly,
      isPublic: parsed.data.isPublic,
      isArchived: parsed.data.isArchived,
    },
  });

  revalidatePath("/admin/plans");
  revalidatePath(`/admin/plans/${planId.data}`);
  revalidatePath("/pricing");

  return { ok: true, message: "Plan saved." };
}
