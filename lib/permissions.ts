// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The ladder
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = [
  "EMPLOYEE",
  "MANAGER",
  "HR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

/*
 * `as const` is what makes this work. Without it, TypeScript widens the array to
 * `string[]` and `Role` becomes `string` — every typo compiles.
 *
 * With it, the array is a readonly tuple of literal types, and `[number]` reads
 * out the union of its members:
 *
 *   type Role = "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN" | "SUPER_ADMIN"
 *
 * One declaration gives you both a runtime value you can iterate (for a role
 * dropdown) and a compile-time type. Add SUPER_HR here later and every switch
 * statement that fails to handle it becomes a type error immediately.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Comparing rank
// ─────────────────────────────────────────────────────────────────────────────

const RANK: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  HR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value in RANK;
}

export function hasRole(userType: string | null | undefined, required: Role): boolean {
  if (!isRole(userType)) return false;
  return RANK[userType] >= RANK[required];
}

/*
 * WHY A LADDER RATHER THAN A LIST OF ALLOWED ROLES?
 *
 * Because that is what your API documents. Endpoints are annotated `[HR+]`,
 * meaning HR *or higher*. Modelled as a list you would have to write, on every
 * endpoint:
 *
 *   allowed: ["HR", "ADMIN", "SUPER_ADMIN"]
 *
 * ...and then remember to update ~40 of those lists the day a role is added.
 * Modelled as rank comparison, `[HR+]` is `hasRole(user, "HR")` and a new role
 * slots into the ladder once.
 *
 * WHY AN EXPLICIT MAP RATHER THAN `ROLES.indexOf(role)`?
 *
 * indexOf would give the same answer today, and it is tempting because it reuses
 * the array. But it ties your security model to array order. The day someone
 * reorders ROLES to make a dropdown read nicely, the hierarchy silently changes
 * and nothing fails — no type error, no test, just an EMPLOYEE who can suddenly
 * approve leave. The map makes the ordering deliberate and greppable.
 *
 * WHY `string | null | undefined` RATHER THAN `Role`?
 *
 * Because the caller usually holds `session?.userType`, which may be absent. The
 * type guard turns "no session" and "unrecognised role" into the same safe
 * answer — false — instead of pushing a null check onto every call site. Failure
 * closed is the only correct default here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Named shorthands
// ─────────────────────────────────────────────────────────────────────────────

export const isManager = (userType?: string | null) => hasRole(userType, "MANAGER");
export const isHR = (userType?: string | null) => hasRole(userType, "HR");
export const isAdmin = (userType?: string | null) => hasRole(userType, "ADMIN");
export const isSuperAdmin = (userType?: string | null) => hasRole(userType, "SUPER_ADMIN");

/*
 * Pure sugar, but it makes intent read at a glance in JSX:
 *
 *   {isHR(user.userType) && <NewEmployeeButton />}
 *
 * Note these mean "at least" — `isManager` is true for an ADMIN. That reads
 * slightly wrong in English, which is worth knowing now rather than misreading
 * later. `isAtLeastManager` would be more accurate and more tiring to type.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · Route gating
// ─────────────────────────────────────────────────────────────────────────────

export const ROUTE_MIN_ROLE: Record<string, Role> = {
  "/leaves": "MANAGER",
  "/leaves/mine": "EMPLOYEE",
  "/vendors": "HR",
};

export function minRoleForPath(pathname: string): Role | null {
  let match: { path: string; role: Role } | null = null;

  for (const [path, role] of Object.entries(ROUTE_MIN_ROLE)) {
    const isMatch = pathname === path || pathname.startsWith(`${path}/`);
    if (isMatch && (!match || path.length > match.path.length)) {
      match = { path, role };
    }
  }

  return match?.role ?? null;
}

export function canAccessPath(userType: string | null | undefined, pathname: string): boolean {
  const required = minRoleForPath(pathname);
  return required ? hasRole(userType, required) : true;
}

/*
 * WHY IS THIS MAP SO SHORT?
 *
 * Because most screens in this app are not role-gated — they are two screens in
 * one. An EMPLOYEE opening /expenses sees their own claims; a MANAGER sees the
 * approval queue. Same route, different content, both allowed. Gating the route
 * would lock employees out of their own expenses.
 *
 * Only three entries earn a place today:
 *
 *   /leaves        the approval queue, GET /leaves is [Manager+]
 *   /leaves/mine   the same feature's employee view, deliberately open
 *   /vendors       the only resource group where every endpoint is [HR+]
 *
 * LONGEST PREFIX WINS
 *
 * That is the whole reason `minRoleForPath` is a loop rather than a lookup.
 * `/leaves/mine` matches both "/leaves" and "/leaves/mine"; taking the longer
 * match means the more specific rule wins, so an employee reaches their own
 * leave history while the queue at /leaves stays shut. Because it compares
 * lengths rather than trusting iteration order, adding entries later cannot
 * quietly reorder the result.
 *
 * WHAT THIS MAP CANNOT EXPRESS
 *
 * /board. Access there is *membership*, not rank — GET /board/membership/me
 * returns a boolean, and an ADMIN who was never added is still refused. It needs
 * a call to the API, so it cannot live in a pure function. That gate belongs in
 * the board layout, in Phase 09.
 *
 * A JUDGEMENT CALL WORTH REVISITING
 *
 * /roles is ungated here because your API does not annotate the role endpoints.
 * Taken literally, any authenticated employee may create roles. That is probably
 * an oversight on the backend rather than an intention — but tightening it here
 * would only hide the buttons, not close the hole. Worth raising with whoever
 * owns the API.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · What this file is not
// ─────────────────────────────────────────────────────────────────────────────

/*
 * THIS IS NOT SECURITY.
 *
 * Everything above runs where the user can reach it. In the browser it ships in
 * a JS bundle that anyone can open, edit and re-run. Someone who flips
 * `hasRole` to return true sees every hidden button in the app.
 *
 * What they will not get is data. Click any of those buttons and the request
 * still goes to your backend, which checks the JWT and answers 403. That is the
 * real gate, and it is the only one that counts.
 *
 * So the job of this file is courtesy, not defence: do not show someone a
 * Vendors link that will only ever 403 them. Treat a missing check here as a
 * usability bug. Treat a missing check on the backend as a breach.
 *
 * The practical consequence: never use this to decide whether to *fetch*
 * something sensitive, only whether to *display* a control. Fetch, let the
 * backend refuse, and handle the 403 — which is exactly why `ApiError` carries
 * `isForbidden`.
 *
 * WHY THERE IS NO I/O IN HERE
 *
 * No fetch, no cookies, no React, no imports at all. That makes this the one
 * file in the project you can test without mocking anything:
 *
 *   hasRole("ADMIN", "HR")      // true  — higher rank satisfies HR+
 *   hasRole("MANAGER", "HR")    // false — lower rank does not
 *   hasRole(undefined, "HR")    // false — no session fails closed
 *   hasRole("OWNER", "HR")      // false — unknown role fails closed
 *
 * It also means it runs anywhere: a Server Component, a Client Component, or
 * middleware. Files that reach for cookies or fetch cannot make that claim, and
 * that constraint is what keeps this one reusable.
 */
