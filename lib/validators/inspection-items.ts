import { z } from "zod";

/**
 * A single applicability pair: "this form applies to inspect-item X at
 * risk-level Y". Forms can carry zero or many pairs; an empty list means
 * the form is surfaced unconditionally.
 */
export const applicabilityPairSchema = z.object({
  riskSectorId: z.string().min(1),
  riskLevelId: z.string().min(1),
});

/**
 * Items always belong to a workspace-managed Category (related list, not free
 * text). The server resolves the category name from `categoryId` at write time
 * and snapshots it onto the `category` column on the item row.
 *
 * `applicability` is optional and (when omitted on update) means "don't
 * touch the existing rules"; an empty array explicitly clears them.
 */
export const inspectionItemCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().min(1, "Category is required"),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.boolean().optional().default(true),
  applicability: z.array(applicabilityPairSchema).max(500).optional(),
});

export const inspectionItemUpdateSchema = inspectionItemCreateSchema.partial();

export type ApplicabilityPair = z.infer<typeof applicabilityPairSchema>;
export type InspectionItemCreateInput = z.infer<typeof inspectionItemCreateSchema>;
export type InspectionItemUpdateInput = z.infer<typeof inspectionItemUpdateSchema>;
