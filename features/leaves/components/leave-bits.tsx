"use client";

import type { LeaveStatus } from "@/features/leaves/types";

// ─────────────────────────────────────────────────────────────────────────────
// Status chip
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<LeaveStatus, string> = {
  PENDING: "bg-secondary/20 text-[#7a5c05]",
  APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-error/10 text-error",
  CANCELLED: "bg-surface-sunk text-text-muted",
};

const STATUS_DOT: Record<LeaveStatus, string> = {
  PENDING: "bg-secondary",
  APPROVED: "bg-primary",
  REJECTED: "bg-error",
  CANCELLED: "bg-text-subtle",
};

export function LeaveStatusChip({ status }: { status: LeaveStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${STATUS_STYLE[status]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-pill ${STATUS_DOT[status]}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/*
 * A `Record<LeaveStatus, string>` rather than a switch or a chain of ternaries.
 * Add a fifth status to the union and TypeScript flags both maps as incomplete —
 * a switch with a default would silently render the new one as grey.
 *
 * Every chip carries a dot and the word, not just a fill. Colour alone is not
 * readable for everyone, and "yellow means pending" is a convention the reader
 * would have to already know.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Dates
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive: a single-day leave is 1 day, not 0. */
export function leaveDays(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / DAY_MS) + 1;
}

export function formatRange(startDate: string, endDate: string) {
  const format = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return startDate === endDate
    ? format(startDate)
    : `${format(startDate)} – ${format(endDate)}`;
}

/*
 * The `+ 1` is the part worth stating. Booking 1st to 1st is one day off, not
 * zero, and 1st to 5th is five days, not four. Off-by-one here produces a leave
 * balance that is quietly wrong for every request.
 *
 * `toLocaleDateString(undefined, …)` uses the reader's own locale, so this runs
 * client-side deliberately — formatting on the server would use the server's.
 */
