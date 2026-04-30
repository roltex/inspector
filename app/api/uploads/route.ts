import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStorage, makeUploadKey } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const orgId = req.headers.get("x-organization-id");
  if (!orgId) return new NextResponse("Missing x-organization-id", { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "misc");
  if (!(file instanceof File)) return new NextResponse("Missing file", { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "";
  const key = makeUploadKey(orgId, folder, ext);
  const { url } = await getStorage().put(key, buf, file.type);
  return NextResponse.json({ url, key });
}
