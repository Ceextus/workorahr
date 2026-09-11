export const SWAP_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type SwapStatus = (typeof SWAP_STATUSES)[number];

export interface Shift {
  id: string;
  name: string;
  /** Local wall-clock time, "08:00:00" — no date and no timezone. */
  startTime: string;
  endTime: string;
  description: string | null;
}

export interface RosterAssignment {
  id: string;
  shiftId: string;
  employeeId: string;
  /** Plain calendar date, "2026-09-08". */
  date: string;

  /* Undocumented response fields — shown when present. */
  shiftName?: string | null;
  employeeName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface RosterRange {
  /** Plain dates — NOT the OffsetDateTime that /bookings wants. */
  start: string;
  end: string;
}

export interface CreateShiftPayload {
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface AssignShiftPayload {
  shiftId: string;
  employeeId: string;
  date: string;
}

export interface SwapRequest {
  id: string;
  shiftAssignmentId: string;
  proposedToEmployeeId: string | null;
  reason: string | null;
  status: SwapStatus;

  /* Undocumented response fields. */
  requestedByEmployeeId?: string | null;
  requestedByName?: string | null;
  proposedToName?: string | null;
  replacementEmployeeId?: string | null;
  date?: string | null;
  shiftName?: string | null;
  createdAt?: string | null;
}

export interface CreateSwapPayload {
  shiftAssignmentId: string;
  /** Omit for an "anyone can take this" request. */
  proposedToEmployeeId?: string | null;
  reason?: string;
}

export interface ApproveSwapPayload {
  id: string;
  /** Only required when the request had no proposedToEmployeeId. */
  replacementEmployeeId?: string;
}

/** "08:00:00" -> "08:00" */
export function shortTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

/*
 * TWO DATE FORMATS IN ONE API, AND MIXING THEM UP IS THE BUG WAITING TO HAPPEN.
 *
 *   /scheduling/roster?start=2026-09-01&end=2026-09-30   plain LocalDate
 *   /bookings?start=2026-09-01T00:00:00Z                 OffsetDateTime
 *
 * They are both called `start` and `end`, they both mean "a window", and they
 * are not interchangeable. Sending an ISO instant to the roster endpoint, or a
 * bare date to bookings, is a 400 that reads like a server problem.
 *
 * `startTime` on a Shift is a third thing again: a wall-clock time with no date
 * and no zone, because "the morning shift starts at 08:00" is true in every
 * timezone the company operates in. It must never be run through `new Date()` —
 * that would attach today's date and the viewer's offset to something that has
 * neither. `shortTime` is deliberately a string slice for exactly that reason.
 */
