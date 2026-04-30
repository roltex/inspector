import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

export async function GET(req: Request) {
  return handlers.GET(req);
}

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "auth"), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }
  return handlers.POST(req);
}
