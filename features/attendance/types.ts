export interface AttendanceRecord {
  id: string;
  /** YYYY-MM-DD, as decided by the server. */
  date: string;
  /** ISO datetime. */
  checkIn: string;
  /** ISO datetime, or null while the person is still checked in. */
  checkOut: string | null;
  employeeId: string;
}

/*
 * The TeamHub collection documents no response body for these endpoints. This
 * shape is carried forward from the earlier EMS docs, where it was spelled out:
 *
 *   { id, date, checkIn, checkOut, employeeId }
 *
 * `checkOut: null` is the meaningful state — it is what "currently checked in"
 * looks like, and the whole check-in card below turns on it.
 */

export interface AttendanceFilters {
  /** YYYY-MM-DD. Optional. */
  date?: string;
  /** Optional. */
  departmentId?: string;
}

export interface MonthlyReportQuery {
  year: number;
  /** 1-12. */
  month: number;
}

/**
 * One row of GET /attendance/report — a per-employee monthly tally.
 *
 * Taken from the backend's AttendanceReportEntryResponse. The Postman
 * collection documents only the two query params and never the response, so
 * this was previously typed as AttendanceRecord[], which it is not.
 */
export interface AttendanceReportEntry {
  employeeId: string;
  employeeName: string | null;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  onLeaveDays: number;
  totalRecordedDays: number;
}

/** The five tallies, in the order they are stacked and legended. */
export const ATTENDANCE_BANDS = [
  { key: "presentDays", label: "Present" },
  { key: "lateDays", label: "Late" },
  { key: "halfDays", label: "Half day" },
  { key: "onLeaveDays", label: "On leave" },
  { key: "absentDays", label: "Absent" },
] as const;

export type AttendanceBandKey = (typeof ATTENDANCE_BANDS)[number]["key"];
