import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · What runs here, and what cannot
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

/*
 * Middleware runs before every matched request, ahead of any rendering. That
 * makes it the cheapest place to bounce a logged-out visitor — and the wrong
 * place to decide anything important.
 *
 * WHAT IT CAN SEE:  that a cookie named accessToken exists.
 * WHAT IT CANNOT:   whether that token is valid, unexpired, or unrevoked, and
 *                   what role it carries. The JWT is opaque to us, and verifying
 *                   it would mean a backend call on every navigation — including
 *                   every image and stylesheet that slips past the matcher.
 *
 * So the honest description of this file is "skip the render when there is
 * obviously no session". A stale or forged cookie sails straight through, and
 * that is fine: `requireSession` in the dashboard layout calls /auth/me and
 * catches it, and the backend rejects the request regardless.
 *
 * Note the import is from lib/auth-cookies, not lib/auth. That is the whole
 * reason auth-cookies exists — lib/auth carries `import "server-only"`, and
 * middleware is not compiled with the react-server condition that makes it inert.
 *
 * A NOTE ON THE FILENAME
 *
 * Next 16 deprecated `middleware` in favour of `proxy` — same behaviour, renamed
 * export. This project stays on `middleware` deliberately. The one practical
 * difference: `middleware` keeps the edge runtime, while `proxy` is nodejs-only.
 * If a session check here ever needs Node APIs, that is the moment to rename.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The gate
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);

  if (isPublicRoute(pathname)) {
    // Signed in already — no reason to show the login form.
    if (hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Remember where they were headed so login can send them back.
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/*
 * TWO REDIRECTS, POINTING OPPOSITE WAYS
 *
 * Logged out on a private route -> /login, carrying `next`.
 * Logged in on a public route   -> /, because a login form is useless to you.
 *
 * That second one matters more than it looks. Without it, hitting /login while
 * signed in shows the form, and logging in again is confusing at best.
 *
 * WHY `new URL(..., request.url)`
 *
 * Redirects need an absolute URL. Passing `request.url` as the base derives the
 * origin from the incoming request, so this keeps working on localhost, on a
 * preview deployment and in production without configuration.
 *
 * WHY `next` CARRIES search AS WELL AS pathname
 *
 * A manager following a link to /leaves?status=PENDING should land back on that
 * filtered queue, not a bare list. `encodeURIComponent` is not needed here —
 * `searchParams.set` encodes the value itself. Doing both would double-encode
 * and produce a literal "%2F" in the path.
 *
 * NOTHING ASYNC HAPPENS IN HERE
 *
 * No fetch, no database, no token verification. This function runs on every
 * matched request, so anything slow here is paid on every navigation in the app.
 * Reading a cookie is essentially free; keep it that way.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · What this runs on
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

/*
 * WITHOUT A MATCHER, THIS RUNS ON EVERYTHING.
 *
 * Every stylesheet, every script chunk, every image in /public. Since the gate
 * redirects anything without a session, a missing matcher means a logged-out
 * visitor gets a login page whose CSS request was *also* redirected to the login
 * page. The result is an unstyled screen and a confusing set of network entries
 * that look nothing like an auth problem.
 *
 * Read the pattern as "everything except":
 *
 *   api              our proxy route handles its own auth, and redirecting an
 *                    API call to an HTML login page would break every fetch.
 *   _next/static     JS and CSS chunks.
 *   _next/image      the image optimiser.
 *   favicon.ico      requested before anything else, on every page.
 *   .svg .png ...    files served straight from /public.
 *
 * `(?!...)` is a negative lookahead: match any path that does not begin with one
 * of these. Everything else falls through to Block 2.
 *
 * NOTE THE BOUNDARY ON `api`
 *
 * It reads `api(?:/|$)`, not plain `api`. A lookahead matches on prefix, so bare
 * `api` would also exclude a future /apidocs or /apiary — no error, middleware
 * just silently stops running there. The `(?:/|$)` forces the segment to end.
 * Same reasoning for escaping the dot in `favicon\.ico`: unescaped, `.` matches
 * any character.
 *
 * Nothing in this app hits either case today. Both are latent traps rather than
 * live bugs, and both are the kind that surface months later as "why is that one
 * page not redirecting?"
 *
 * MATCHERS MUST BE STATIC
 *
 * Next reads this at build time to decide which requests to route here. A value
 * built from a variable is silently ignored — no error, the middleware just
 * stops running where you expected. Keep the array literal.
 *
 * THE TRAP WORTH KNOWING NOW
 *
 * Server Actions are not separate routes — they arrive as POST requests to the
 * route that uses them. So a matcher that excludes a path also skips middleware
 * for any Server Action called from it. Moving an action to a different route
 * can silently drop it out of coverage, with no error to notice.
 *
 * Which is the same lesson as Block 1, arriving from a different direction:
 * never let this file be the only thing standing between a user and your data.
 * Check the session inside each Server Action, and let the backend have the
 * final word.
 */
