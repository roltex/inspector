"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient(), magicLinkClient()],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  organization,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
