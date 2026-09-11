import type { Role } from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The user
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** The single value the role ladder ranks. Pass this to hasRole(). */
  userType: Role;
  /** Assigned role records. Related to userType, but not the rank. */
  roles: string[];
}

/*
 * WHY types.ts COMES FIRST IN EVERY FEATURE
 *
 * Because api.ts and hooks.ts are almost mechanical once this exists. Copy the
 * response shapes out of your Postman docs, get them right once, and the other
 * two files nearly write themselves — with the compiler checking every field
 * name you type from then on.
 *
 * Do it the other way round and you end up threading `any` through three files
 * and discovering the real shape at runtime.
 *
 * WHY THIS FILE OWNS AuthUser, NOT lib/auth.ts
 *
 * lib/auth.ts defined this shape earlier, because it needed something for
 * /auth/me to return. Now that the feature exists, the feature owns it and
 * lib/auth.ts imports it from here.
 *
 * Two definitions of the same shape is not a stylistic problem, it is a bug
 * waiting for the backend to add a field. One gets updated, the other does not,
 * and the mismatch shows up somewhere unrelated. One definition, imported.
 *
 * The import direction is worth a note. Normally lib/ is the lower layer and
 * features/ builds on it, so lib/auth.ts reaching into features/auth is upside
 * down. It is fine here for one specific reason: this is a *type-only* import,
 * and TypeScript erases it completely at build time. No runtime dependency is
 * created in either direction. Keep it that way — if lib/ ever needs a runtime
 * value from features/, the layering really is wrong and something should move.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · What each endpoint accepts
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  newPassword: string;
  /** The one-time code emailed by POST /auth/forgot-password. */
  token: string;
}

export interface ChangePasswordPayload {
  /** Requires an active session — this is the signed-in change, not the reset. */
  oldPassword: string;
  newPassword: string;
}

/*
 * A payload type per endpoint, rather than one shared `AuthPayload` with
 * everything optional. The endpoints genuinely differ, and modelling that
 * honestly means the compiler catches a missing `otp` before the backend does.
 *
 * Note the two password flows are separate and not interchangeable:
 *
 *   ResetPasswordPayload    forgotten it. Proves identity with the emailed `token`.
 *                           No session required.
 *
 *   ChangePasswordPayload   knows it, wants a new one. Proves identity with the
 *                           current password. Requires a session.
 */
