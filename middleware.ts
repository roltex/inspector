import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/features",
  "/about",
  "/blog",
  "/legal",
  "/maintenance",
];
const AUTH_ROUTES = ["/sign-in", "/sign-up", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Better Auth adds a `__Secure-` prefix to cookies when `useSecureCookies` is on
  // (which is enabled in production). Check both prefixed and non-prefixed variants
  // so dev (HTTP) and prod (HTTPS) both work.
  const sessionCookie =
    request.cookies.get("__Secure-inspector.session_token") ??
    request.cookies.get("inspector.session_token") ??
    request.cookies.get("__Secure-inspector.session") ??
    request.cookies.get("inspector.session") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth.session_token");

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/manifest") ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";

  // Forward the path to server components so the maintenance gate can read it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Block /admin/* outright at the edge if there is no session cookie. The
  // fine-grained super-admin check is performed server-side in the layout.
  if (isAdminRoute && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isPublic || isAuthRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
