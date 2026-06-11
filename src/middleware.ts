import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Cheap edge guard: cookie-presence only. Authoritative validation (session
// integrity + allowlist re-check) lives in requireSession() server-side — this
// just keeps anonymous users out of the app shell without a DB round-trip.
export function middleware(request: NextRequest): NextResponse {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals, the auth API, and the public
  // auth pages. /api/auth must be excluded so the OAuth callback round-trips.
  matcher: [
    "/((?!_next/static|_next/image|api/auth|sign-in|unauthorized|favicon.ico|manifest.webmanifest|icon|apple-icon|robots.txt|sitemap.xml).*)",
  ],
};
