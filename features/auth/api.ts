import { api } from "@/lib/api-client";

import type {
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Session
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets the accessToken + refreshToken HttpOnly cookies as a side effect.
 * Nothing in JavaScript ever touches those — see Block 2 below.
 */
export const login = (payload: LoginPayload) =>
  api.post<AuthUser>("/auth/login", payload);

export const getCurrentUser = () => api.get<AuthUser>("/auth/me");

/** Reads the refreshToken cookie and rotates both cookies. */
export const refreshTokens = () => api.post<null>("/auth/refresh");

/** Invalidates the refresh token server-side and clears both cookies. */
export const logout = () => api.post<null>("/auth/logout");

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Passwords
// ─────────────────────────────────────────────────────────────────────────────

/** No auth required. Emails a six-digit OTP. */
export const forgotPassword = (payload: ForgotPasswordPayload) =>
  api.post<null>("/auth/forgot-password", payload);

/** No auth required. Completes the flow started by forgotPassword. */
export const resetPassword = (payload: ResetPasswordPayload) =>
  api.post<null>("/auth/reset-password", payload);

/** Requires an active session. */
export const changePassword = (payload: ChangePasswordPayload) =>
  api.post<null>("/auth/change-password", payload);

/*
 * WHAT THIS LAYER IS FOR
 *
 * One function per endpoint. No state, no React, no error handling, no
 * navigation. Each line is a name, a URL and a type — and that is the whole job.
 *
 * The discipline pays off in three ways:
 *
 *   Readable    this file is a table of contents for the API. Someone new can
 *               read seven lines and know what auth can do.
 *
 *   Reusable    nothing here is tied to React, so a Server Component can call
 *               these too. That matters: hooks.ts cannot run on the server, but
 *               this file can.
 *
 *   Replaceable if an endpoint moves or is renamed, exactly one line changes and
 *               every caller keeps working.
 *
 * Resist putting anything else here. The moment an api.ts function starts
 * redirecting, showing a toast or reading component state, it stops being usable
 * from the server and the layering has quietly collapsed.
 *
 * NOTE `login` RETURNS A USER BUT NOT A TOKEN
 *
 * That is not an omission in the API. The tokens arrive as Set-Cookie headers on
 * the response, HttpOnly, so script cannot read them. This function never sees
 * them and does not need to — by the time the promise resolves, the browser has
 * already stored them, and the next request carries them automatically.
 *
 * The whole of Phase 00 exists to make that sentence true. `login` looks like an
 * ordinary POST precisely because the proxy route is doing the work underneath.
 *
 * WHY `api.post<null>` ON THE WRITE ENDPOINTS
 *
 * Those endpoints answer with `data: null`. Typing it as `null` rather than
 * `void` records what the backend actually sends and keeps the envelope shape
 * honest — the generic is always the type of `data`, whatever that turns out
 * to be.
 */
