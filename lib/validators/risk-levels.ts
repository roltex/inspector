import { z } from "zod";

/**
 * Semantic tone tokens the UI understands. Each maps to a preset
 * Tailwind palette so the workspace doesn't need to author CSS. Keep
 * in sync with `RISK_TONES` in `app/[orgSlug]/risk-sectors/sector-badge.tsx`.
 */
export const RISK_TONES = [
  "muted",
  "info",
  "success",
  "warning",
  "danger",
  "critical",
] as const;
export type RiskTone = (typeof RISK_TONES)[number];

export const riskLevelCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  code: z
    .string()
    .trim()
    .max(12)
    .regex(/^[A-Za-z0-9_-]*$/, {
      message: "Code can only contain letters, numbers, hyphens and underscores.",
    })
    .optional()
    .nullable(),
  description: z.string().max(300).optional().nullable(),
  tone: z.enum(RISK_TONES).optional().default("muted"),
  /**
   * Numeric weight used by dashboards / sorting. 0–100 is conventional
   * but not enforced; higher = more severe.
   */
  score: z.coerce.number().int().min(0).max(1000).optional().default(0),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const riskLevelUpdateSchema = riskLevelCreateSchema.partial();

export type RiskLevelCreateInput = z.infer<typeof riskLevelCreateSchema>;
export type RiskLevelUpdateInput = z.infer<typeof riskLevelUpdateSchema>;
