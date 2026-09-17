import { api, asList } from "@/lib/api-client";

import type {
  AttendanceFilters,
  AttendanceRecord,
  AttendanceReportEntry,
  MonthlyReportQuery,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Your own clock
// ─────────────────────────────────────────────────────────────────────────────

/** Applies to the authenticated employee. No body. */
export const checkIn = () => api.post<AttendanceRecord>("/attendance/check-in");

/** PUT, not POST — it closes today's existing record rather than creating one. */
export const checkOut = () => api.put<AttendanceRecord>("/attendance/check-out");

export const getMyAttendance = async () =>
  asList<AttendanceRecord>(await api.get("/attendance/me"), "GET /attendance/me");

/*
 * Neither takes an employeeId. There is no endpoint for clocking someone else
 * in or out — the server reads the session. So a "mark Jane as present" control
 * has nothing to call, no matter what an HR screen might want.
 *
 * The verbs are the tell: POST creates today's record, PUT closes it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Everyone [HR/Admin]
// ─────────────────────────────────────────────────────────────────────────────

export const listAttendance = async (filters: AttendanceFilters = {}) =>
  asList<AttendanceRecord>(
    await api.get("/attendance", { query: { ...filters } }),
    "GET /attendance",
  );

/**
 * [HR/Admin] Monthly report.
 *
 * Returns one row per employee with their monthly tallies, NOT a list of
 * individual attendance records — the two are easy to confuse because every
 * sibling endpoint on this controller returns the latter.
 */
export const getMonthlyReport = async ({ year, month }: MonthlyReportQuery) =>
  asList<AttendanceReportEntry>(
    await api.get("/attendance/report", { query: { year, month } }),
    "GET /attendance/report",
  );
