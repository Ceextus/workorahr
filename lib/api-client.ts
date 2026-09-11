// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Where requests go
// ─────────────────────────────────────────────────────────────────────────────

/** Full backend origin + version prefix, e.g. https://ems.railway.app/api/v1 */
export const SERVER_API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:8080/api/v1";

/** Same-origin prefix. `app/api/[...proxy]/route.ts` re-attaches the rest. */
export const CLIENT_API_BASE_URL = "/api";

export const isServer = typeof window === "undefined";

/*
 * WHY TWO BASE URLS?
 *
 * Your backend authenticates with HttpOnly cookies. "HttpOnly" means JavaScript
 * cannot read that cookie or attach it to a request by hand — only the browser
 * can, and a browser only sends a cookie back to the origin that set it.
 *
 * Your app runs on localhost:3000. Your backend runs on railway.app. Different
 * origins, so the cookie never travels. That is not a bug to work around; it is
 * the security model doing its job.
 *
 * So each runtime reaches the backend differently:
 *
 *   Browser -> "/api/..."  (our own origin, so the cookie attaches automatically)
 *              then the Route Handler you write next relays it onward.
 *
 *   Server  -> the backend directly. A server has no cookie jar of its own, so
 *              it must copy the incoming request's cookie header onto the
 *              outgoing call. That is `serverFetch` in lib/auth.ts, which you
 *              write next phase. This file only needs to know the URL differs.
 *
 * One detail worth noticing: `API_BASE_URL` has no NEXT_PUBLIC_ prefix, so Next
 * replaces it with `undefined` in client bundles. Your real backend URL never
 * ships to the browser. The client branch never reads it, so that costs nothing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The response envelope
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

/*
 * WHY UNWRAP HERE AND NOWHERE ELSE?
 *
 * Every endpoint in your API answers with the same wrapper:
 *
 *   { "success": true, "message": "...", "data": { ... } }
 *
 * The useful part is always `data`. If each caller unwraps it, you get
 * `response.data.data` scattered across a hundred call sites, and the day the
 * backend adds a field to the envelope you edit a hundred files.
 *
 * Unwrapping once, here, means `T` throughout the app is the thing you actually
 * wanted: `api.get<Department[]>(...)` resolves to `Department[]`, not to an
 * envelope you have to open.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · A failure that carries its status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keys that belong to the response envelope rather than to a field. Needed
 * because this backend returns validation errors as a flat top-level map, so
 * telling "a field called email" from "the envelope's message" is name-based.
 */
const ENVELOPE_KEYS = new Set([
  "success",
  "message",
  "timestamp",
  "data",
  "status",
  "code",
  "path",
  "error",
  "errors",
  "request_id",
]);

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  /**
   * Field-level validation messages, when the backend sent any.
   *
   * A 400 usually means one field is wrong, but the top-level `message` is
   * often something unhelpful like "Validation failed". The useful detail sits
   * in a nested `errors` object, and every framework shapes it differently.
   * Normalising the three common shapes here means no form has to guess.
   */
  get fieldErrors(): { field: string; message: string }[] {
    if (!this.body || typeof this.body !== "object") return [];
    const record = this.body as Record<string, unknown>;

    const toPairs = (source: Record<string, unknown>) =>
      Object.entries(source)
        .filter(([key, value]) => !ENVELOPE_KEYS.has(key) && typeof value === "string")
        .map(([field, message]) => ({ field, message: message as string }));

    const nested = record.errors;

    // Shape 1 — Spring's default: errors: [{ field, defaultMessage }]
    if (Array.isArray(nested)) {
      return nested
        .map((entry: { field?: string; defaultMessage?: string; message?: string }) => ({
          field: entry.field ?? "",
          message: entry.defaultMessage ?? entry.message ?? "",
        }))
        .filter((entry) => entry.message);
    }

    // Shape 2 — errors: { firstName: "must not be blank" }
    if (nested && typeof nested === "object") {
      return toPairs(nested as Record<string, unknown>);
    }

    // Shape 3 — the flat map this backend actually sends:
    //   { "departmentId": "Department is required", "email": "Email must be valid" }
    // No envelope, no `errors` key. Everything that is not a known envelope
    // field and holds a string is treated as a field message.
    return toPairs(record);
  }
}

/*
 * WHY NOT JUST `throw new Error("Request failed")`?
 *
 * Because the UI has to react differently to each failure, and it can only do
 * that if the status survives the throw:
 *
 *   401  the session expired      -> send them to /login
 *   403  role is too low          -> "You do not have access to this"
 *   404  it is gone               -> render an empty state, not an error
 *   409  conflict                 -> "That room is already booked"
 *
 * A bare Error flattens all four into one useless string. Carrying `status` is
 * what lets a component branch on the reason.
 *
 * `body` keeps the parsed payload for the rare case a caller needs more, such as
 * field-level validation errors on a create form.
 *
 * A subtle one: extending built-in classes like Error breaks `instanceof` when
 * TypeScript targets ES5. Your tsconfig targets ES2017, so `err instanceof
 * ApiError` works correctly. If you ever lower that target, this quietly stops
 * matching and the catch block falls through without telling you.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · What a caller may pass
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  /** Any value — serialised to JSON unless it is FormData. */
  body?: unknown;
  /** Query params. Empty, null and undefined entries are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>;
}

/*
 * WHY REDEFINE `body`?
 *
 * `RequestInit["body"]` is BodyInit — string, Blob, FormData and friends. That
 * would force every caller to stringify first:
 *
 *   api.post("/departments", JSON.stringify(payload))   // noisy, easy to forget
 *
 * Omitting it and re-adding it as `unknown` lets callers pass the object itself
 * and lets this file decide how to serialise it. Everything else from
 * RequestInit — `signal`, `cache`, `next`, `headers` — passes through untouched.
 *
 * `query` exists so callers never hand-build a query string. Compare:
 *
 *   `/employees?departmentId=${id}&active=${active}`     // breaks on undefined
 *   { query: { departmentId, active } }                  // handled in Block 5
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · Building the URL
// ─────────────────────────────────────────────────────────────────────────────

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const base = isServer ? SERVER_API_BASE_URL : CLIENT_API_BASE_URL;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

/*
 * WHY SKIP EMPTY VALUES?
 *
 * Your employees screen has three optional filters. When the user clears the
 * department dropdown, `departmentId` becomes undefined. Without the skip you
 * would send:
 *
 *   /employees?departmentId=&jobTitle=&active=true
 *
 * An empty string is not the same as "no filter" — a backend is free to read it
 * as "match employees whose department is empty" and hand back zero rows.
 * Sending only the keys that have values keeps "cleared" meaning cleared.
 *
 * URLSearchParams also handles encoding, so a job title like "Sales & Ops"
 * survives instead of truncating at the ampersand.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 6 · The one function that does the work
// ─────────────────────────────────────────────────────────────────────────────

async function requestOnce<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, query, headers, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      // FormData must set its own Content-Type — see note 1 below.
      ...(!isFormData && body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: isFormData
      ? (body as FormData)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  // 1 · No content. Nothing to parse, and parsing would throw.
  if (response.status === 204) {
    return undefined as T;
  }

  // 2 · Not JSON — a file download. Hand back the Response untouched.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new ApiError(response.status, describeFailure(response));
    }
    return response as unknown as T;
  }

  // 3 · The normal path: an envelope.
  /*
   * 3 · JSON — but read it as text first.
   *
   * Several endpoints answer 200 with an empty body and a JSON content-type
   * (update, activate, profile-picture upload). Calling .json() on those throws
   * "Unexpected end of JSON input", which reads like a parse bug when the
   * request in fact succeeded. Checking for 204 alone is not enough.
   */
  const raw = await response.text();

  if (!raw) {
    if (!response.ok) throw new ApiError(response.status, describeFailure(response));
    return undefined as T;
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    // Content-type claimed JSON and it is not. Trust the status, keep the text.
    if (!response.ok) throw new ApiError(response.status, describeFailure(response), raw);
    return raw as unknown as T;
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(response.status, describeFailure(response, payload), payload);
  }

  return payload.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 6b · Silent token refresh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The in-flight refresh, if there is one.
 *
 * Module scope, so every caller in the tab shares it. Ten queries mounting at
 * once and all getting 401 must produce ONE call to /auth/refresh, not ten —
 * the backend rotates the refresh token, so the second concurrent call would
 * present one that the first has already invalidated. That is not a wasted
 * request, it is a logout.
 */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Endpoints that must never trigger a refresh attempt.
 *
 * `/auth/refresh` for the obvious reason. The other three are the unauthenticated
 * flows: a 401 from login means "wrong password", and trying to refresh a
 * session that was never established just adds a pointless request to every
 * failed login.
 */
const NO_REFRESH_PATHS = [
  "/auth/refresh",
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/**
 * Ask the backend to rotate the cookie pair.
 *
 * Uses `fetch` directly rather than `apiFetch`, which removes any possibility
 * of recursion: a 401 from the refresh endpoint itself cannot re-enter this
 * function. It also means no envelope parsing — the only thing that matters is
 * whether the status was ok, because the new cookies arrive as Set-Cookie
 * headers that JavaScript never sees.
 */
export async function refreshSession(): Promise<boolean> {
  if (isServer) return false;

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${CLIENT_API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return response.ok;
    } catch {
      // Offline, DNS failure, request aborted — not a valid session either way.
      return false;
    } finally {
      // Clearing the module variable does not affect callers already awaiting
      // the promise; they hold their own reference to it.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  try {
    return await requestOnce<T>(path, options);
  } catch (error) {
    const shouldTryRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      !isServer &&
      !NO_REFRESH_PATHS.some((candidate) => path.startsWith(candidate));

    if (shouldTryRefresh && (await refreshSession())) {
      // One retry, and only one. If this 401s too, the refresh token is dead
      // and the error propagates as it always did.
      return requestOnce<T>(path, options);
    }

    throw error;
  }
}

/*
 * THE SESSION USED TO DIE MID-TASK, SILENTLY, AND THIS IS THE FIX.
 *
 * Access tokens expire. Nothing in this app called POST /auth/refresh, so the
 * first request after expiry failed with a 401 and surfaced as an error toast —
 * "Unauthorized" in the middle of filling in a form, with no way to recover
 * except reloading and logging in again, losing whatever was typed.
 *
 * Now a 401 is treated as "the access token may just be stale": refresh once,
 * retry once, and the user never learns anything happened. If the refresh token
 * has also expired, the 401 comes through exactly as before.
 *
 * WHY THIS SITS IN apiFetch RATHER THAN IN TanStack Query
 *
 * A `retry` function on the QueryClient could do something similar for queries.
 * It could not do it for mutations without repeating the logic, it has no
 * natural place to put the single-flight guard, and it would not cover the
 * direct `apiFetch` calls in each feature api module. One wrapper around the
 * single function every request already goes through covers all of it.
 *
 * WHY `!isServer` — THIS DELIBERATELY DOES NOTHING DURING A SERVER RENDER
 *
 * A refresh only helps if the new cookies are stored, and only the browser can
 * store them. A Server Component cannot set a cookie — that is a hard Next
 * constraint, not an oversight — so refreshing there would rotate the tokens,
 * throw the new pair away, and invalidate the old one the browser is still
 * holding. Strictly worse than doing nothing.
 *
 * The gap that leaves is real and is covered separately: see
 * components/layout/session-keep-alive.tsx, which keeps the cookie fresh from
 * the client so server renders find a valid one.
 *
 * `??=` FOR THE SINGLE-FLIGHT GUARD
 *
 * Assigns only when the left side is null or undefined, so the first caller
 * creates the promise and everyone arriving while it is pending awaits the same
 * one. The `finally` clears it afterwards, so a later expiry starts a fresh
 * attempt rather than replaying a stale result.
 */

/** 502/503/504 come from the platform, not the app — say something useful. */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

function describeFailure(response: Response, payload?: { message?: string }) {
  if (GATEWAY_STATUSES.has(response.status)) {
    return "The server is unavailable right now. Please try again in a moment.";
  }
  return payload?.message ?? response.statusText ?? "Request failed";
}

/*
 * WHY THE GATEWAY MESSAGE IS OVERRIDDEN AND NOTHING ELSE IS
 *
 * Everywhere else this file passes the backend's own wording through, because
 * the backend knows why it refused and we do not.
 *
 * A 502 is different: it does not come from your application at all. It is the
 * platform — Railway, a load balancer, a proxy — reporting that it could not
 * reach the app. "Application failed to respond" is accurate infrastructure
 * language and meaningless to whoever is trying to log in.
 *
 * The original text is still on `error.body` for debugging. Only the message
 * shown to a person is replaced.
 */

/*
 * THE FOUR THINGS THIS FUNCTION HANDLES, AND WHY EACH IS HERE
 *
 * 1 · FormData must not get a Content-Type header.
 *     Uploading an avatar sends multipart/form-data, and that header has to
 *     carry a randomly generated boundary marker:
 *
 *       Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryAbc123
 *
 *     Only the browser knows that boundary, and it sets the header itself. Set
 *     "application/json" over the top and the backend cannot find where each
 *     field starts — you get a 400 that looks nothing like a header problem.
 *     This is the most common upload bug there is, and it costs hours.
 *
 * 2 · 204 is checked before reading the body.
 *     Delete a department, cancel a leave, deactivate an employee — all answer
 *     204 No Content. Calling .json() on an empty body throws "Unexpected end of
 *     JSON input", which reads like a parse failure when the request in fact
 *     succeeded. Order matters: check the status first, never parse.
 *
 * 3 · Non-JSON means a download.
 *     GET /policy-documents/:id/download streams raw bytes with a
 *     Content-Disposition header. There is no envelope to unwrap, so the raw
 *     Response goes back and the caller decides — .blob() to save it, .text()
 *     to read it. Every other endpoint in your API is JSON.
 *
 * 4 · Failure is checked two ways.
 *     `!response.ok` catches ordinary HTTP failures. `payload.success === false`
 *     catches a backend that answers 200 with a failure envelope. Check only the
 *     status and that second case resolves as success, so the UI renders
 *     `undefined` — a bug that surfaces far from its cause.
 *
 * ON `credentials: "include"`
 *
 *     Browser calls are same-origin, and fetch already sends cookies there by
 *     default. This line is not doing the work you might assume. It is here so
 *     that if you ever point the client straight at the backend with CORS, the
 *     cookies still go — and so the intent is visible when you read the file.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 7 · The surface everything else uses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coerces a list endpoint's payload into an array, whatever wrapper it arrived in.
 *
 * `[...(data ?? [])]` crashes with "is not iterable" the moment an endpoint that
 * used to return an array starts returning an object — a paginated envelope, say.
 * That is a white screen, not a degraded list, and it is entirely avoidable.
 *
 * Recognises a bare array and the usual wrappers, and warns in development with
 * the real payload when it recognises none, so an unexpected shape is reported
 * rather than silently swallowed.
 */
export function asList<T>(value: unknown, endpoint: string): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    for (const key of ["content", "items", "results", "records", "data"]) {
      const inner = (value as Record<string, unknown>)[key];
      if (Array.isArray(inner)) return inner as T[];
    }
  }

  if (value !== null && value !== undefined && process.env.NODE_ENV !== "production") {
    console.warn(
      `[api] ${endpoint} was expected to return a list. Got:`,
      value,
      "\nAdd its wrapper key to asList() in lib/api-client.ts.",
    );
  }

  return [];
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

/*
 * WHY WRAP apiFetch AT ALL?
 *
 * Only for how the call sites read. Every api.ts file you write from Phase 03
 * onward is a list of one-liners, and this is the difference:
 *
 *   apiFetch<Department[]>("/departments", { method: "GET" })
 *   api.get<Department[]>("/departments")
 *
 * Note where the generic goes. `T` is the UNWRAPPED type — write
 * `api.get<Department[]>`, never `api.get<ApiEnvelope<Department[]>>`. Block 6
 * already opened the envelope; the envelope type is an implementation detail
 * that no feature file should ever have to name.
 *
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * Automatic token refresh. Your API exposes POST /auth/refresh, so it is
 * tempting to catch every 401 in Block 6 and retry. Resist that for now: done
 * carelessly it turns one expired session into an infinite refresh loop, and it
 * needs a queue so ten parallel 401s trigger one refresh instead of ten. It is a
 * real feature with real edge cases — worth adding once login works and you can
 * watch it behave, not before.
 */
