"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user as userTable } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { LOCALE_COOKIE, LOCALES, isLocale, type Locale } from "./config";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: Locale): Promise<{ ok: boolean; locale: Locale }> {
  if (!isLocale(locale)) {
    return { ok: false, locale: LOCALES[0] };
  }
  cookies().set(LOCALE_COOKIE, locale, {
    httpOnly: false, // readable by JS so the switcher can react instantly
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });

  // Persist on the user record if signed in.
  try {
    const session = await getSession();
    if (session?.user?.id) {
      await db
        .update(userTable)
        .set({ locale, updatedAt: new Date() })
        .where(eq(userTable.id, session.user.id));
    }
  } catch {
    // Cookie alone is sufficient if the DB write fails.
  }

  revalidatePath("/", "layout");
  return { ok: true, locale };
}
