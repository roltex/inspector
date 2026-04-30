import { z } from "zod";

/**
 * Items always belong to a workspace-managed Category (related list, not free
 * text). The server resolves the category name from `categoryId` at write time
 * and snapshots it onto the `category` column on the item row.
 */
export const inspectionItemCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().min(1, "Category is required"),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const inspectionItemUpdateSchema = inspectionItemCreateSchema.partial();

export type InspectionItemCreateInput = z.infer<typeof inspectionItemCreateSchema>;
export type InspectionItemUpdateInput = z.infer<typeof inspectionItemUpdateSchema>;
