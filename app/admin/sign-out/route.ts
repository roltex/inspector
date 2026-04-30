import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler() {
  const session = await getSession();
  clearAdminCookie();
  if (session?.user) {
    await recordAudit({
      userId: session.user.id,
      action: "admin.signout",
    });
  }
  return NextResponse.redirect(new URL("/admin/sign-in", process.env.BETTER_AUTH_URL ?? "http://localhost:3000"));
}

export const GET = handler;
export const POST = handler;
