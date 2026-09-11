"use client";

import type { AttendanceRecord } from "@/features/attendance/types";

/** Local YYYY-MM-DD. See the timezone note at the bottom. */
export function todayIso() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The record for a given day, if one exists. */
export function recordFor(records: AttendanceRecord[] | undefined, date: string) {
  return records?.find((record) => record.date === date);
}

export function formatTime(iso: string | null) {
  if (!iso) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "7h 42m" between check-in and check-out, or up to now if still open. */
export function duration(checkIn: string, checkOut: string | null) {
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  const minutes = Math.floor((end - start) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/*
 * `todayIso` BUILDS THE STRING FROM LOCAL PARTS, NOT `toISOString()`
 *
 * `new Date().toISOString().slice(0, 10)` is the obvious one-liner and it is
 * wrong: it converts to UTC first. At 22:00 in Lagos that yields tomorrow's
 * date, so the check-in card would look for a record that does not exist and
 * offer to clock you in a second time.
 *
 * Reading the local year, month and day avoids the conversion entirely.
 *
 * THE CAVEAT WORTH KNOWING
 *
 * The server decides what `date` a record carries, and it may use its own
 * timezone rather than the employee's. If the two disagree, someone working a
 * late shift can see today's record not match. Nothing the frontend can fix —
 * the endpoint takes no timezone — but it is the first thing to check if
 * check-in state ever looks wrong near midnight.
 *
 * `duration` COUNTS TO NOW WHEN checkOut IS NULL
 *
 * So an open session reads as elapsed time rather than a blank. It does not tick
 * on its own — it recomputes on render — which is honest enough for a summary
 * and avoids a timer on every row.
 */
