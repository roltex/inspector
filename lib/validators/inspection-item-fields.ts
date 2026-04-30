import { z } from "zod";

export const FIELD_TYPES = [
  // Text-based
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "url",
  // Choices
  "select", // searchable dropdown (single)
  "multiselect", // searchable dropdown (multi)
  "radio", // single choice (radio buttons)
  "multicheck", // multi-choice (checkbox group)
  // Booleans
  "checkbox",
  // Time
  "date",
  "datetime",
  "time",
  // Numeric scales
  "rating", // 1-5
  "severity", // LOW / MEDIUM / HIGH / CRITICAL
  // Attachments
  "photo", // image with camera capture
  "file", // any file
  // Repeatable group of sub-fields (stacked card per row)
  "repeatable",
  // Spreadsheet-style table (sub-fields = columns, inspector adds rows)
  "table",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** Field types that require an `options` list. */
export const OPTION_BACKED_TYPES: FieldType[] = [
  "select",
  "multiselect",
  "radio",
  "multicheck",
];

/** Field types that hold an array of sub-rows (same data shape, different UI). */
export const ROW_BACKED_TYPES: FieldType[] = ["repeatable", "table"];

/**
 * Sub-field types — same as `FieldType` minus the row-backed types
 * (no nesting allowed inside `repeatable` / `table`).
 */
export const SUB_FIELD_TYPES = FIELD_TYPES.filter(
  (t) => !ROW_BACKED_TYPES.includes(t),
) as Exclude<FieldType, "repeatable" | "table">[];

const optionSchema = z.object({
  value: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
});

const slug = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/, {
    message:
      "Use lowercase letters, numbers and underscores; must start/end alphanumeric.",
  });

/** A sub-field definition (same shape as a top-level field but no nesting). */
export const subFieldSchema = z
  .object({
    key: slug,
    label: z.string().trim().min(1).max(120),
    type: z.enum(SUB_FIELD_TYPES as [string, ...string[]]),
    options: z.array(optionSchema).max(50).optional().nullable(),
    required: z.boolean().optional().default(false),
    placeholder: z.string().max(200).optional().nullable(),
    helpText: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (OPTION_BACKED_TYPES.includes(data.type as FieldType)) {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "This sub-field type needs at least one option.",
        });
      }
    }
  });

export type SubFieldDef = z.infer<typeof subFieldSchema>;

/** A single preset row: key→value pairs (values are validated leniently). */
const presetRowSchema = z.record(z.unknown());

const baseFieldShape = {
  key: slug,
  label: z.string().trim().min(1).max(120),
  type: z.enum(FIELD_TYPES),
  options: z.array(optionSchema).max(50).optional().nullable(),
  subFields: z.array(subFieldSchema).max(50).optional().nullable(),
  presetRows: z.array(presetRowSchema).max(500).optional().nullable(),
  required: z.boolean().optional().default(false),
  placeholder: z.string().max(200).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
};

export const inspectionItemFieldCreateSchema = z
  .object(baseFieldShape)
  .superRefine((data, ctx) => {
    if (OPTION_BACKED_TYPES.includes(data.type)) {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "This field type needs at least one option.",
        });
      }
    }
    if (ROW_BACKED_TYPES.includes(data.type)) {
      if (!data.subFields || data.subFields.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subFields"],
          message: `${data.type === "table" ? "Tables" : "Repeatable groups"} need at least one sub-field.`,
        });
      } else {
        const seen = new Set<string>();
        for (const sf of data.subFields) {
          if (seen.has(sf.key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["subFields"],
              message: `Duplicate sub-field key "${sf.key}".`,
            });
          }
          seen.add(sf.key);
        }
        // Preset row keys must reference real sub-fields.
        if (data.presetRows && data.presetRows.length > 0) {
          for (let i = 0; i < data.presetRows.length; i++) {
            const row = data.presetRows[i] ?? {};
            for (const k of Object.keys(row)) {
              if (!seen.has(k)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ["presetRows", i, k],
                  message: `Preset row references unknown column "${k}".`,
                });
              }
            }
          }
        }
      }
    } else if (data.presetRows && data.presetRows.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["presetRows"],
        message: "Preset rows are only allowed for table or repeatable fields.",
      });
    }
  });

export const inspectionItemFieldUpdateSchema = z
  .object({
    key: slug.optional(),
    label: z.string().trim().min(1).max(120).optional(),
    type: z.enum(FIELD_TYPES).optional(),
    options: z.array(optionSchema).max(50).optional().nullable(),
    subFields: z.array(subFieldSchema).max(50).optional().nullable(),
    presetRows: z.array(presetRowSchema).max(500).optional().nullable(),
    required: z.boolean().optional(),
    placeholder: z.string().max(200).optional().nullable(),
    helpText: z.string().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.type !== undefined &&
      OPTION_BACKED_TYPES.includes(data.type) &&
      data.options !== undefined
    ) {
      if (!data.options || data.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "This field type needs at least one option.",
        });
      }
    }
    if (
      data.type !== undefined &&
      ROW_BACKED_TYPES.includes(data.type) &&
      data.subFields !== undefined
    ) {
      if (!data.subFields || data.subFields.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subFields"],
          message: `${data.type === "table" ? "Tables" : "Repeatable groups"} need at least one sub-field.`,
        });
      } else {
        const seen = new Set<string>();
        for (const sf of data.subFields) {
          if (seen.has(sf.key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["subFields"],
              message: `Duplicate sub-field key "${sf.key}".`,
            });
          }
          seen.add(sf.key);
        }
      }
    }
  });

export type InspectionItemFieldCreateInput = z.infer<
  typeof inspectionItemFieldCreateSchema
>;
export type InspectionItemFieldUpdateInput = z.infer<
  typeof inspectionItemFieldUpdateSchema
>;
