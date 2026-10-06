import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Public routes: no session required.
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Optimistic auth check (Next.js 16 "proxy" = former middleware).
 * Verifies the signed session cookie only — no DB hits.
 * Real data protection also lives in `requireApiSession()` inside API routes.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const authed = Boolean(session?.userId);

  // Already signed in → don't show the login page again.
  if (isPublic(pathname) && authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (!isPublic(pathname) && !authed) {
    // APIs answer with JSON 401 so client fetches can handle it.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.nextUrl);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except build assets and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|woff2?)$).*)"],
};


