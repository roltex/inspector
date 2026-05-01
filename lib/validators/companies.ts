import { z } from "zod";

const optStr = (max = 200) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
    .nullable();

export const companyCreateSchema = z.object({
  name: z.string().min(2).max(200),
  code: optStr(50),
  /** Optional FK into `risk_sector`. NULL / "" ⇒ unclassified. */
  riskSectorId: optStr(32),
  contactName: optStr(200),
  contactEmail: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
    .refine((v) => v == null || /.+@.+\..+/.test(v), { message: "Invalid email" })
    .nullable(),
  contactPhone: optStr(50),
  address: optStr(500),
  notes: optStr(2000),
  isActive: z.boolean().optional().default(true),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

export const companyObjectCreateSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2).max(200),
  code: optStr(50),
  type: optStr(100),
  address: optStr(500),
  city: optStr(100),
  country: optStr(100),
  managerName: optStr(200),
  managerEmail: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
    .refine((v) => v == null || /.+@.+\..+/.test(v), { message: "Invalid email" })
    .nullable(),
  managerPhone: optStr(50),
  notes: optStr(2000),
  isActive: z.boolean().optional().default(true),
});

export const companyObjectUpdateSchema = companyObjectCreateSchema.partial().extend({
  companyId: z.string().min(1).optional(),
});

export type CompanyObjectCreateInput = z.infer<typeof companyObjectCreateSchema>;
export type CompanyObjectUpdateInput = z.infer<typeof companyObjectUpdateSchema>;
