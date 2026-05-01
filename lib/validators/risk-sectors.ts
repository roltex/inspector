import { z } from "zod";

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
  /**
   * FK into the workspace's risk-level dictionary. Pass `null` to leave
   * the sector unrated; callers validate it belongs to the same workspace.
   */
  riskLevelId: z.string().min(1).optional().nullable(),
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
