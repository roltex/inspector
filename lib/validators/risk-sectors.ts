import { z } from "zod";

/**
 * The four canonical severity levels reused from the DB's `severity` enum.
 * Keep this aligned with `severityEnum` in `lib/db/schema.ts` so Zod and the
 * database stay in sync.
 */
export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const riskSectorCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .max(12)
    .regex(/^[A-Za-z0-9_-]*$/, {
      message: "Code can only contain letters, numbers, hyphens and underscores.",
    })
    .optional()
    .nullable(),
  description: z.string().max(500).optional().nullable(),
  defaultRisk: z.enum(RISK_LEVELS).default("MEDIUM"),
  /**
   * Accent colour token (e.g. "amber", "rose"). Kept loose — the UI treats
   * unknown values as the neutral chip, so typos are harmless.
   */
  color: z.string().max(40).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const riskSectorUpdateSchema = riskSectorCreateSchema.partial();

export type RiskSectorCreateInput = z.infer<typeof riskSectorCreateSchema>;
export type RiskSectorUpdateInput = z.infer<typeof riskSectorUpdateSchema>;
