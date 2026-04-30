import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization, magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";

const superAdminEmails = new Set(
  env.SUPER_ADMIN_EMAILS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

function isAllowlistedAdmin(email: string | null | undefined) {
  return Boolean(email && superAdminEmails.has(email.toLowerCase()));
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      superAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
      bannedAt: { type: "date", required: false, input: false },
      banReason: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          if (isAllowlistedAdmin(createdUser.email)) {
            await db
              .update(schema.user)
              .set({ superAdmin: true })
              .where(eq(schema.user.id, createdUser.id));
          }
        },
      },
    },
    session: {
      create: {
        before: async (sess) => {
          const [u] = await db
            .select({
              id: schema.user.id,
              email: schema.user.email,
              superAdmin: schema.user.superAdmin,
              bannedAt: schema.user.bannedAt,
            })
            .from(schema.user)
            .where(eq(schema.user.id, sess.userId))
            .limit(1);
          if (!u) return;
          if (u.bannedAt) {
            // Better Auth will surface this as the sign-in error message.
            throw new Error("Your account has been suspended. Please contact support.");
          }
          // Auto-promote when an existing user matching the allowlist signs in.
          if (!u.superAdmin && isAllowlistedAdmin(u.email)) {
            await db
              .update(schema.user)
              .set({ superAdmin: true })
              .where(eq(schema.user.id, u.id));
          }
        },
      },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: "OWNER",
      membershipLimit: 1000,
      invitationExpiresIn: 60 * 60 * 48,
      sendInvitationEmail: async (data) => {
        const url = `${env.NEXT_PUBLIC_APP_URL}/accept-invite/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: `You've been invited to ${data.organization.name} on Inspector`,
          html: `<p>You were invited to join <strong>${data.organization.name}</strong> on Inspector.</p><p><a href="${url}">Accept invitation</a></p>`,
        });
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Your Inspector sign-in link",
          html: `<p>Click to sign in:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    }),
    nextCookies(),
  ],
  advanced: {
    cookiePrefix: "inspector",
    // Only mark cookies as Secure when actually served over HTTPS. This keeps
    // `next start` over plain http://localhost working while still securing
    // cookies in real production deployments.
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
  },
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
});

export type Session = typeof auth.$Infer.Session;
