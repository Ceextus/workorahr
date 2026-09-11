export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/*
 * The TeamHub collection documents `status` as an optional filter without
 * enumerating it. These four come from the earlier EMS docs and match the values
 * the swap-request endpoint spells out, so they are almost certainly the same
 * set — but they are inherited, not confirmed against this build.
 */

export const LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
  "EMERGENCY",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

/*
 * Same caveat, more strongly: the current docs only ever show "ANNUAL". The rest
 * are carried over from the previous collection. If a submission is rejected
 * with an enum error, this list is the first place to look.
 */

export interface LeaveRequest {
  id: string;
  leaveType: LeaveType;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  employeeId: string;
  createdAt: string;
  /** Not documented; present on some responses. The queue falls back to the id. */
  employeeName?: string | null;
}

export interface CreateLeavePayload {
  leaveType: LeaveType;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LeaveFilters {
  status?: LeaveStatus;
  employeeId?: string;
}
