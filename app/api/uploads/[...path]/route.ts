import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const mimeByExt: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  svg: "image/svg+xml",
};

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  const session = await getSession();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const rel = params.path.join("/");
  const full = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR, rel);
  const root = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  if (!full.startsWith(root)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const st = await stat(full);
    if (!st.isFile()) return new NextResponse("Not found", { status: 404 });
    const ext = path.extname(full).slice(1).toLowerCase();
    const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": mimeByExt[ext] ?? "application/octet-stream",
        "Content-Length": String(st.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
