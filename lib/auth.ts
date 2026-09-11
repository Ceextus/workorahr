import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthUser } from "@/features/auth/types";
import { apiFetch, ApiError, type ApiRequestOptions } from "@/lib/api-client";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_COOKIES,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { hasRole, type Role } from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Server-only, and the cookies it looks for
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Imported for use below AND re-exported, so existing callers can keep reaching
 * for these on lib/auth. `export { x } from "..."` alone would forward the names
 * without putting them in this module's scope.
 */
export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, AUTH_COOKIES };

/*
 * THIS FILE MAY NEVER BE IMPORTED BY A CLIENT COMPONENT.
 *
 * `next/headers` only exists on the server. Import this from a file carrying
 * "use client" and the build fails — which is the good outcome. The bad outcome
 * is importing it into a file that *looks* shared, such as a feature's api.ts,
 * and dragging server code toward the browser bundle.
 *
 * That is the rule api-client.ts was written to respect: it stays free of
 * `next/headers` precisely so hooks can import it. This file is the other half
 * of that split — the server half.
 *
 * The `import "server-only"` at the top enforces that rather than documenting
 * it. The package is two files and ships no runtime code — it declares a
 * "react-server" export condition that resolves to a module which throws at
 * build time. On the server the condition matches and the import is inert; in a
 * client bundle it does not, and the build fails with a message naming this
 * file. A subtle bundling accident becomes an immediate, located error.
 *
 * Worth adding to any file that touches cookies, secrets or a database. The
 * mirror image is `client-only`, for modules that need `window`.
 *
 * The two cookie names are exported rather than typed inline because
 * middleware.ts needs the access-token name too, and a typo in one of two
 * string literals is a bug that reads as "login silently does nothing".
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Who the user is
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Defined in features/auth/types.ts — the feature owns its own shapes. Imported
 * for use below and re-exported so existing callers can keep reaching for it
 * here. Type-only, so nothing survives to runtime in either direction.
 */
export type { AuthUser };

/*
 * Straight from GET /auth/me. Note there are two role-ish fields, and they are
 * not interchangeable:
 *
 *   userType   a single value, and the one the ladder in permissions.ts ranks.
 *              This is what `[HR+]` refers to. Pass this to hasRole().
 *
 *   roles      an array of assigned role records. Related, but not the rank.
 *
 * Typing `userType` as `Role` rather than `string` is a small lie with a payoff:
 * the backend could in principle return something outside the union. `hasRole`
 * fails closed on unknown values anyway, so the lie is safe — and it means
 * `hasRole(user.userType, "HR")` type-checks without a cast at every call site.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Forwarding the caller's cookies
// ─────────────────────────────────────────────────────────────────────────────

export async function getCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function serverFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const cookieHeader = await getCookieHeader();

  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      cookie: cookieHeader,
    },
  });
}

/*
 * THIS IS THE POINT OF THE FILE.
 *
 * Block 1 of api-client.ts left a gap: on the server there is no cookie jar, so
 * a plain fetch to the backend arrives anonymous and gets a 401. `serverFetch`
 * closes that gap by copying the incoming request's cookies onto the outgoing
 * call.
 *
 * Note the shape of the two paths, and how they differ:
 *
 *   browser   fetch("/api/auth/me")
 *             -> browser attaches the cookie itself, because same-origin
 *             -> the proxy route relays it to the backend
 *
 *   server    serverFetch("/auth/me")
 *             -> we read the cookie and set the header by hand
 *             -> straight to the backend, no proxy hop
 *
 * `cookies()` is awaited because Next 16 removed synchronous access entirely.
 * In Next 14 this was `cookies().getAll()`; that form no longer compiles, which
 * is worth recognising when you hit an older tutorial.
 *
 * Forwarding *all* cookies rather than just the two auth ones is deliberate —
 * it keeps any future session or locale cookie working without edits here. It is
 * safe because the destination is your own backend. Never do this when
 * forwarding to a third party: you would be handing them the session.
 *
 * Note the `cookie` key sits *after* the spread, so a caller cannot accidentally
 * override the session by passing their own headers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · The current session
// ─────────────────────────────────────────────────────────────────────────────

export const getSession = cache(async (): Promise<AuthUser | null> => {
  const store = await cookies();

  /*
   * No cookie means logged out — no point spending a round-trip to learn that.
   *
   * This line is also, accidentally, load-bearing. Verified against the live
   * backend on 2026-09-04:
   *
   *   /auth/me with no cookie        -> 500 "Something went wrong"   (a bug)
   *   /auth/me with invalid cookie   -> 401 "Invalid session"        (correct)
   *
   * The 500 is wrong — an unauthenticated request is a 401, not a server error.
   * Because this early return fires first, our code never reaches that path, so
   * the bug cannot reach us. Worth reporting upstream anyway: remove this check
   * as a "pointless optimisation" and every logged-out visitor throws instead of
   * being redirected.
   */
  if (!store.has(ACCESS_TOKEN_COOKIE)) return null;

  try {
    return await serverFetch<AuthUser>("/auth/me", { cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) {
      return null;
    }
    throw error;
  }
});

/*
 * WHY `cache()`?
 *
 * React's `cache` memoises a function for the lifetime of one server render.
 * Without it, a dashboard layout asking "who am I?", plus a header, plus a
 * sidebar, plus the page itself, is four identical /auth/me calls on one
 * navigation. With it, the first call runs and the other three get its result.
 *
 * This is per-request, not a shared cache — a different visitor renders with a
 * fresh one. That is the same distinction lib/query-client.ts is about, and the
 * reason a module-level cache would be a data leak rather than an optimisation.
 *
 * WHY 401 RETURNS null BUT 500 THROWS
 *
 * They are different situations and deserve different outcomes.
 *
 * A 401 is not an error — it is the answer. "Nobody is logged in" is a normal
 * state, and callers handle it by showing the login page.
 *
 * A 500, or a backend that is unreachable, means we genuinely do not know who is
 * looking. Swallowing that as `null` would bounce a logged-in user to /login,
 * where they would log in successfully and get bounced again — a redirect loop
 * that looks like an auth bug and is actually an outage. Letting it throw
 * surfaces the real problem in an error boundary.
 *
 * `cache: "no-store"` because a session must never be served from a cached
 * response. This is the second layer of that guarantee; force-dynamic on the
 * proxy route was the first.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · Requiring a session, or a rank
// ─────────────────────────────────────────────────────────────────────────────

export async function requireSession(returnTo?: string): Promise<AuthUser> {
  const user = await getSession();

  if (!user) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }

  return user;
}

export async function requireRole(role: Role): Promise<AuthUser> {
  const user = await requireSession();

  if (!hasRole(user.userType, role)) {
    redirect("/?denied=1");
  }

  return user;
}

/*
 * THE TRAP IN THIS BLOCK
 *
 * `redirect()` does not return — it throws a NEXT_REDIRECT error that Next
 * catches upstream to perform the redirect. Which means this quietly breaks:
 *
 *   try {
 *     const user = await getSession()
 *     if (!user) redirect("/login")     // WRONG — caught below
 *   } catch (e) {
 *     console.error(e)                  // swallows the redirect
 *   }
 *
 * The user stays on the page, logged out, and the only trace is a console line.
 * Always call `redirect` outside a try block. Note both functions above do.
 *
 * The upside of throwing: TypeScript types `redirect` as returning `never`, so
 * after the `if (!user)` block the compiler knows `user` is an AuthUser. No cast,
 * no non-null assertion.
 *
 * WHY TWO FUNCTIONS RATHER THAN ONE
 *
 * They fail differently, because the failures mean different things.
 *
 *   requireSession   "I don't know who you are" -> /login, carrying `next` so
 *                    they land back where they were aiming.
 *
 *   requireRole      "I know exactly who you are, and it isn't enough" ->
 *                    the dashboard. Sending them to /login would be actively
 *                    misleading: logging in again cannot fix a rank problem.
 *
 * WHERE THESE BELONG
 *
 * `requireSession` goes in app/(dashboard)/layout.tsx and guards everything
 * beneath it. That is the real gate — middleware only checked that a cookie
 * exists, not that it is valid.
 *
 * `requireRole` goes at the top of the few genuinely gated pages, and should
 * agree with ROUTE_MIN_ROLE in permissions.ts. Today that means /vendors needs
 * `requireRole("HR")` and /leaves needs `requireRole("MANAGER")`.
 *
 * And to say it once more: both of these are still courtesy. The backend
 * re-checks the JWT on every request, and that is what actually protects data.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 6 · Clearing the session
// ─────────────────────────────────────────────────────────────────────────────

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  for (const name of AUTH_COOKIES) {
    store.delete(name);
  }
}

/*
 * WHERE THIS CAN AND CANNOT BE CALLED
 *
 * Reading cookies works anywhere on the server. Writing them does not:
 * `.set` and `.delete` are only legal in a Server Action or a Route Handler.
 *
 * The reason is mechanical rather than arbitrary. A cookie is written with a
 * Set-Cookie *response header*, and by the time a Server Component is rendering,
 * the response has already begun streaming — the headers are gone. Call this
 * during render and Next throws.
 *
 * So: call it from a Server Action or a Route Handler, never from a page or
 * layout body.
 *
 * WHEN YOU ACTUALLY NEED IT
 *
 * Rarely. POST /auth/logout already clears both cookies on the backend, and the
 * proxy route relays that Set-Cookie back to the browser. The normal logout path
 * never touches this function.
 *
 * It earns its place for the case the backend cannot fix: a refresh token that
 * has expired or been revoked server-side, leaving a stale cookie that makes
 * middleware think there is a session when every request 401s. This is the local
 * reset for that state.
 */
