import { z } from "zod";
import {
  FIELD_TYPES,
  ROW_BACKED_TYPES,
  OPTION_BACKED_TYPES,
  subFieldSchema,
  type FieldType,
} from "./inspection-item-fields";

/**
 * Snapshot of a single form field as stored on a template. Mirrors the shape
 * of `inspection_item_field` minus surrogate keys / timestamps so that a
 * template is fully self-contained and can be re-applied long after the
 * source item has gone away.
 */
export const templateFieldSnapshotSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/),
    label: z.string().trim().min(1).max(120),
    type: z.enum(FIELD_TYPES),
    options: z
      .array(
        z.object({
          value: z.string().trim().min(1).max(100),
          label: z.string().trim().min(1).max(100),
        }),
      )
      .max(50)
      .optional()
      .nullable(),
    subFields: z.array(subFieldSchema).max(50).optional().nullable(),
    presetRows: z.array(z.record(z.unknown())).max(500).optional().nullable(),
    required: z.boolean().default(false),
    placeholder: z.string().max(200).optional().nullable(),
    helpText: z.string().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .superRefine((data, ctx) => {
    if (OPTION_BACKED_TYPES.includes(data.type as FieldType)) {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "This field type needs at least one option.",
        });
      }
    }
    if (ROW_BACKED_TYPES.includes(data.type as FieldType)) {
      if (!data.subFields || data.subFields.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subFields"],
          message: "Row-backed fields need at least one sub-field.",
        });
      }
    }
  });

export type TemplateFieldSnapshot = z.infer<typeof templateFieldSnapshotSchema>;

/* -------------------------------------------------------------------------- */
/*  Template create / update                                                  */
/* -------------------------------------------------------------------------- */

const baseTemplateShape = {
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  categoryName: z.string().trim().min(1).max(120).optional().nullable(),
  fields: z.array(templateFieldSnapshotSchema).max(200).default([]),
  isActive: z.boolean().optional().default(true),
};

/** Create a workspace-scoped template (organization owns the row). */
export const inspectionItemTemplateCreateSchema = z.object({
  ...baseTemplateShape,
});
export type InspectionItemTemplateCreateInput = z.infer<
  typeof inspectionItemTemplateCreateSchema
>;

/**
 * Create a GLOBAL template (super-admin scope). Same shape as the workspace
 * version but additionally exposes the `autoSeed` flag — global templates with
 * `autoSeed=true` are cloned into every newly-created workspace.
 */
export const inspectionItemGlobalTemplateCreateSchema = z.object({
  ...baseTemplateShape,
  autoSeed: z.boolean().optional().default(false),
});
export type InspectionItemGlobalTemplateCreateInput = z.infer<
  typeof inspectionItemGlobalTemplateCreateSchema
>;

/** Partial-update schema (every field optional). */
export const inspectionItemTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  categoryName: z.string().trim().min(1).max(120).optional().nullable(),
  fields: z.array(templateFieldSnapshotSchema).max(200).optional(),
  isActive: z.boolean().optional(),
  autoSeed: z.boolean().optional(), // only honoured for global templates
});
export type InspectionItemTemplateUpdateInput = z.infer<
  typeof inspectionItemTemplateUpdateSchema
>;

/** Apply-template input — the workspace can override the resulting item name. */
export const applyTemplateInputSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().trim().min(1).max(160).optional(),
  categoryId: z.string().min(1).optional(),
});
export type ApplyTemplateInput = z.infer<typeof applyTemplateInputSchema>;
