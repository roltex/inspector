import { z } from "zod";

export const inspectionCreateSchema = z.object({
  /** Optional — auto-generated from company + object if omitted. */
  title: z.string().min(2).max(200).optional(),
  templateId: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
  /** New fields: who and where is being inspected. */
  companyId: z.string().min(1).optional().nullable(),
  objectId: z.string().min(1).optional().nullable(),
  scheduledFor: z
    .string()
    .optional()
    .nullable()
    .refine(
      (v) => v == null || v === "" || !Number.isNaN(new Date(v).getTime()),
      { message: "Invalid date" },
    ),
  assigneeId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
  /** Selected catalog item ids (workspace's "what to inspect" list). */
  itemIds: z.array(z.string().min(1)).optional().default([]),
});

export type InspectionCreateInput = z.infer<typeof inspectionCreateSchema>;

export const inspectionUpdateSchema = inspectionCreateSchema.partial().extend({
  status: z
    .enum(["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"])
    .optional(),
  score: z.number().optional().nullable(),
  maxScore: z.number().optional().nullable(),
  answers: z.record(z.any()).optional(),
});

export const findingCreateSchema = z.object({
  inspectionId: z.string(),
  /** Free-text description — optional when a structured form is used. */
  description: z.string().min(1).max(2000).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  questionKey: z.string().optional(),
  /** Optional link to the per-inspection checklist row this finding belongs to. */
  itemSelectionId: z.string().min(1).optional().nullable(),
  /**
   * Structured field values keyed by `inspection_item_field.key`. The shape
   * is owned by the form-builder definition and validated against it on the
   * server before insert.
   */
  values: z.record(z.unknown()).optional().nullable(),
});

export type FindingCreateInput = z.infer<typeof findingCreateSchema>;

export const findingUpdateSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  values: z.record(z.unknown()).optional().nullable(),
});

export type FindingUpdateInput = z.infer<typeof findingUpdateSchema>;
