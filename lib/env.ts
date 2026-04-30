import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Inspector"),
  // Empty / file: / pglite: → uses PGlite locally. postgres:// or postgresql:// → real Postgres.
  DATABASE_URL: z.string().default("file:./.pglite"),
  BETTER_AUTH_SECRET: z.string().min(16).default("development-secret-please-change-me-in-production"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Inspector <no-reply@inspector.app>"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional().default(""),
  STRIPE_PRICE_STARTER_YEARLY: z.string().optional().default(""),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional().default(""),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional().default(""),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".uploads"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional().default(""),
  VAPID_PRIVATE_KEY: z.string().optional().default(""),
  // Comma-separated list of email addresses that should be auto-promoted to
  // platform super-admin on sign-up / sign-in. Useful for self-hosted bootstrap.
  SUPER_ADMIN_EMAILS: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
