import { z } from "zod";

export const inspectionItemCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(40).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const inspectionItemCategoryUpdateSchema =
  inspectionItemCategoryCreateSchema.partial();

export type InspectionItemCategoryCreateInput = z.infer<
  typeof inspectionItemCategoryCreateSchema
>;
export type InspectionItemCategoryUpdateInput = z.infer<
  typeof inspectionItemCategoryUpdateSchema
>;
