import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { session as sessionTable, user as userTable } from "@/lib/db/schema";
import { getT } from "@/lib/i18n";

const TOKEN_COOKIE_NAMES = [
  "__Secure-inspector.session_token",
  "inspector.session_token",
];

async function getCurrentImpersonation() {
  const jar = cookies();
  let token: string | undefined;
  for (const name of TOKEN_COOKIE_NAMES) {
    const c = jar.get(name);
    if (c?.value) {
      token = c.value.split(".")[0];
      break;
    }
  }
  if (!token) return null;
  const [row] = await db
    .select({
      impersonatedBy: sessionTable.impersonatedBy,
      userId: sessionTable.userId,
      userName: userTable.name,
      userEmail: userTable.email,
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(userTable.id, sessionTable.userId))
    .where(eq(sessionTable.token, token))
    .limit(1);
  if (!row || !row.impersonatedBy) return null;
  return row;
}

export async function ImpersonationBanner() {
  const info = await getCurrentImpersonation().catch(() => null);
  if (!info) return null;
  const { t } = await getT();
  return (
    <div className="sticky top-0 z-[60] w-full bg-destructive text-destructive-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="truncate">
          {t("admin.impersonation.banner", { name: info.userName, email: info.userEmail })}
        </div>
        <form action="/admin/impersonation/stop" method="post">
          <button
            type="submit"
            className="rounded-lg bg-background/15 px-3 py-1 text-xs font-medium hover:bg-background/25"
          >
            {t("admin.impersonation.stop")}
          </button>
        </form>
      </div>
    </div>
  );
}
