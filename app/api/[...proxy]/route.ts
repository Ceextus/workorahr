import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SERVER_API_BASE_URL } from "@/lib/api-client";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · What this file is
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

/*
 * A `route.ts` is a Route Handler: the same folder-based routing as `page.tsx`,
 * but it answers with data instead of UI. A folder may hold one or the other,
 * never both.
 *
 * The folder is named `[...proxy]`, a catch-all segment. Everything after
 * `/api/` is collected into an array named after the folder:
 *
 *   /api/departments            ->  proxy = ["departments"]
 *   /api/employees/abc-123      ->  proxy = ["employees", "abc-123"]
 *   /api/leaves/xyz/approve     ->  proxy = ["leaves", "xyz", "approve"]
 *
 * One file therefore covers all ~107 endpoints. The name `proxy` here is just a
 * variable name that happens to describe the job. It has nothing to do with
 * Next 16 renaming the `middleware` file convention to `proxy` — different
 * concept entirely, and worth keeping straight since you have both in this repo.
 *
 * `force-dynamic` opts the route out of every caching layer. GET handlers can
 * otherwise be treated as static, and a cached response here would mean serving
 * one user's data to the next. Auth-bearing responses must never be cached.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Headers that must not be forwarded
// ─────────────────────────────────────────────────────────────────────────────

const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  "set-cookie",
]);

/*
 * These are "hop-by-hop" headers: they describe one connection, not the message
 * being carried. Copying them onto a second connection is meaningless at best
 * and corrupting at worst. Three of them cause real, hard-to-diagnose bugs:
 *
 *   host              would announce "localhost:3000" to a backend that expects
 *                     its own hostname — breaks virtual hosting and TLS routing.
 *
 *   content-length    describes the body we received, not the one we send. Get
 *                     this wrong and the receiver truncates or hangs waiting.
 *
 *   content-encoding  the sharpest of the three. `fetch` already decompressed
 *                     the backend's gzip for us. Forward the header anyway and
 *                     the browser tries to gunzip plain text, producing garbled
 *                     output with no error to explain it.
 *
 * `set-cookie` is on the response list for a different reason: it needs
 * rewriting rather than dropping, which is Block 3.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Re-scoping the auth cookies
// ─────────────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";

function rewriteSetCookie(value: string): string {
  return value
    .split(";")
    .filter((part) => {
      const attribute = part.trim().toLowerCase();
      if (attribute.startsWith("domain=")) return false;
      if (isDev && attribute === "secure") return false;
      return true;
    })
    .map((part) => {
      // SameSite=None is only legal alongside Secure, which we just removed.
      if (isDev && part.trim().toLowerCase() === "samesite=none") {
        return " SameSite=Lax";
      }
      return part;
    })
    .join(";");
}

/*
 * The backend issues its cookies for its own host. Relayed unchanged, the
 * browser would reject them and login would appear to succeed while leaving you
 * logged out — the most confusing failure in this whole phase.
 *
 *   Domain=      Pins the cookie to the backend host, so the browser refuses to
 *                store it for localhost. Removing the attribute entirely makes
 *                the cookie default to the host that served the response, which
 *                is now us. That is exactly what we want.
 *
 *   Secure       Means "HTTPS only". Browsers do treat localhost as trustworthy,
 *                so this often survives in dev — but it breaks the moment you
 *                open the app on a LAN IP to test from your phone. Dropping it
 *                in dev only is the safety net.
 *
 *   SameSite     If Secure comes off, SameSite=None must come off too: the pair
 *                is invalid on its own, and the browser silently discards the
 *                whole cookie. Downgrading to Lax is correct here anyway, since
 *                after proxying these are same-origin cookies.
 *
 * Note this runs per cookie, and Block 6 calls it in a loop. That matters —
 * login sets two.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · Rebuilding the target URL
// ─────────────────────────────────────────────────────────────────────────────

async function handler(
  request: NextRequest,
  context: { params: Promise<{ proxy: string[] }> },
) {
  const { proxy } = await context.params;
  const path = proxy.map(encodeURIComponent).join("/");
  const target = `${SERVER_API_BASE_URL}/${path}${request.nextUrl.search}`;

  /*
   * `params` is a Promise. This is the Next 16 breaking change that trips up
   * every tutorial written before it — `params.proxy` without the await is
   * `undefined`, and the error surfaces later as a malformed URL.
   *
   * Next generates a typed helper for this, so you could write the signature as
   * `context: RouteContext<"/api/[...proxy]">` instead. Both are correct. The
   * explicit form is spelled out here because it makes the Promise visible,
   * which is the part worth remembering.
   *
   * `encodeURIComponent` re-encodes each segment because Next hands them to you
   * already decoded. Without it a segment containing a space or `#` would
   * silently truncate the URL.
   *
   * `nextUrl.search` carries the query string through untouched — that is how
   * `?status=PENDING` and `?departmentId=...` survive the hop.
   */

  // ───────────────────────────────────────────────────────────────────────────
  // BLOCK 5 · Forwarding the request
  // ───────────────────────────────────────────────────────────────────────────

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[api-proxy] ${request.method} ${target} failed`, error);
    return NextResponse.json(
      { success: false, message: "Unable to reach the API.", data: null },
      { status: 502 },
    );
  }

  /*
   * The cookie header rides along in that `forEach` — that is the entire point
   * of this file. The browser attached it because we are same-origin; we hand it
   * to the backend unchanged.
   *
   *   arrayBuffer()   Buffers the body rather than streaming it. Streaming a
   *                   request body in Node needs `duplex: "half"` and is fussy,
   *                   and buffering guarantees multipart boundaries arrive byte
   *                   for byte — which profile-picture and document uploads
   *                   depend on. The trade-off is real: a large upload sits in
   *                   memory. Fine at this scale; revisit if you add big files.
   *
   *   GET and HEAD    Must not carry a body. `fetch` throws if you give them one.
   *
   *   redirect        "manual" hands a backend 3xx to the browser instead of
   *                   following it here, where the redirect would resolve
   *                   against the wrong origin.
   *
   *   catch           A backend that is down is not a 500 in your app — it is a
   *                   502, "bad gateway". Note the response is shaped like your
   *                   envelope, so `apiFetch` parses this failure the same way it
   *                   parses every other one.
   */

  // ───────────────────────────────────────────────────────────────────────────
  // BLOCK 6 · Relaying the response
  // ───────────────────────────────────────────────────────────────────────────

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", rewriteSetCookie(cookie));
  }

  const body =
    upstream.status === 204 || upstream.status === 304 ? null : upstream.body;

  return new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/*
 * `getSetCookie()` rather than `headers.get("set-cookie")`, and the difference
 * matters: login sets two cookies, and `.get()` collapses repeated headers into
 * one comma-joined string. Cookie expiry dates contain commas
 * ("Expires=Wed, 09 Jun 2027..."), so that join produces two corrupt cookies out
 * of two valid ones. `getSetCookie()` returns them as a proper array, and
 * `append` re-sends them as separate headers.
 *
 * `append`, not `set` — `set` would overwrite the first cookie with the second
 * and you would end up authenticated with only half a session.
 *
 * 204 and 304 must carry no body; constructing a Response with one throws. The
 * same 204s from file 1 turn up here: delete a department, cancel a leave.
 *
 * Everything else passes through with its original status, so your `apiFetch`
 * sees the backend's real 401 or 403 rather than something invented here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 7 · One handler, every verb
// ─────────────────────────────────────────────────────────────────────────────

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as HEAD,
  handler as OPTIONS,
};

/*
 * A Route Handler exposes an HTTP method by exporting a function with that name.
 * Anything you do not export returns 405 Method Not Allowed.
 *
 * A proxy treats every verb identically — read the request, pass it on, relay
 * the answer — so the logic is written once and exported under seven names
 * rather than copied seven times.
 *
 * Your API uses all of them: PUT for approve/reject and check-out, PATCH is
 * available, DELETE for cancellations, HEAD and OPTIONS for the browser's own
 * preflight and probing.
 */
