import { z } from "zod";
import { ROLES } from "@/lib/rbac/permissions";

const roleSchema = z.enum(ROLES as [string, ...string[]]);

export const memberCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(200)
    .refine((v) => /.+@.+\..+/.test(v), { message: "Invalid email" }),
  password: z.string().min(8).max(200),
  role: roleSchema,
});

export const memberUpdateSchema = z.object({
  role: roleSchema,
});

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
