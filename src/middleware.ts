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
  // Protect everything except Next internals, the auth API, the cron API, and the
  // public auth pages. /api/auth must be excluded so the OAuth callback
  // round-trips; /api/cron must be excluded because cron-job.org sends no session
  // cookie — that route is guarded by the CRON_SECRET bearer check instead, so a
  // cookie redirect here would make the endpoint permanently unreachable. The PWA
  // shell files (sw.js, manifest.json, /offline) must stay public so an anonymous
  // or offline client can install the worker and reach the offline fallback.
  matcher: [
    "/((?!_next/static|_next/image|api/auth|api/cron|sign-in|unauthorized|offline|sw.js|manifest.json|icons|favicon.ico|manifest.webmanifest|icon|apple-icon|robots.txt|sitemap.xml).*)",
  ],
};
