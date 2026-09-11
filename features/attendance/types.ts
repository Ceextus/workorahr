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
