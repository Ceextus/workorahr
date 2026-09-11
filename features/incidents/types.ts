export const INCIDENT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "CLOSED",
] as const;

export const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

/*
 * Both lists are exhaustive in the docs — "status (OPEN, ACKNOWLEDGED, RESOLVED,
 * CLOSED) and severity (LOW, MEDIUM, HIGH, CRITICAL)". That is a closed set,
 * unlike the notification `type` field, so these are real unions rather than
 * free strings.
 *
 * Declared as `as const` arrays rather than TypeScript `enum`s so the same
 * value can be both a type and something you can iterate to build a filter bar.
 */

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;

  /*
   * Everything below is optional because the docs specify the *request* bodies
   * and never show a response. These are the fields the lifecycle endpoints
   * imply must exist somewhere; each one is rendered defensively so a field
   * this backend spells differently degrades to "—" instead of crashing.
   */
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  reportedByUserId?: string | null;
  reportedByName?: string | null;
  resolutionNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
}

export interface ReportIncidentPayload {
  title: string;
  description: string;
  severity: IncidentSeverity;
}

export interface AssignIncidentPayload {
  id: string;
  /** A USER id, not an employee id. See the note at the foot of this file. */
  assigneeUserId: string;
}

export interface ResolveIncidentPayload {
  id: string;
  resolutionNotes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// On-call
// ─────────────────────────────────────────────────────────────────────────────

export interface OnCallAssignment {
  id: string;
  /** Also a USER id. */
  userId: string;
  userName?: string | null;
  /** ISO datetime with a zone, e.g. 2026-09-08T00:00:00Z */
  startsAt: string;
  endsAt: string;
}

export interface CreateOnCallPayload {
  userId: string;
  startsAt: string;
  endsAt: string;
}

/**
 * Is this assignment live right now?
 *
 * Module-level rather than inline in a component, because it reads the clock —
 * the React Compiler rejects `Date.now()` in a render body.
 */
export function isOnCallNow(assignment: OnCallAssignment): boolean {
  const now = Date.now();
  const from = new Date(assignment.startsAt).getTime();
  const to = new Date(assignment.endsAt).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return false;
  return from <= now && now < to;
}

/*
 * THE USER-ID PROBLEM, AND IT IS A REAL BLOCKER WORTH RAISING WITH THE BACKEND
 *
 * The docs are unusually explicit about this:
 *
 *   "employeeUserId (the linked user id of an employee, not the employee id
 *    itself) comes from Employees > Create Employee."
 *
 * So `assigneeUserId` and the on-call `userId` are keys into the *users* table.
 * Every other screen in this app identifies people by employee id, and
 * `useEmployeeNameMap()` — the shared id→name lookup that makes the leave queue
 * and attendance roster readable — is keyed by employee id. It cannot resolve
 * these.
 *
 * And there is no endpoint that lists users, or that maps an employee to their
 * linked user id. GET /employees returns employees; nothing exposes the join.
 *
 * The practical consequence: this app cannot offer a "pick a person to assign"
 * dropdown, because it has no way to learn the user ids to put in it. Assign
 * and on-call therefore take a pasted id, and names only appear if the backend
 * includes `assigneeName`/`userName` in its responses.
 *
 * TWO THINGS WOULD FIX IT, EITHER ONE:
 *
 *   1 · Add `userId` to the Employee response. Then the existing employee list
 *       becomes the picker and this whole problem disappears.
 *   2 · Have these endpoints accept an employeeId and resolve the user
 *       internally, which is what every other endpoint in the API already does.
 *
 * Until then the UI is honest about it rather than guessing that employee id
 * and user id happen to be the same value — the exact assumption that silently
 * broke the profile-picture uploader.
 */
