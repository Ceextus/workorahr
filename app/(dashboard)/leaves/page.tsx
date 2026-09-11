import type { Metadata } from "next";

import { LeaveQueue } from "@/features/leaves/components/leave-queue";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Leave requests · Workora",
};

export default async function LeaveQueuePage() {
  // GET /leaves is Manager/HR/Admin. This is the one page whose whole purpose
  // requires rank, so it gates rather than hiding controls.
  await requireRole("MANAGER");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Leave requests</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Approve or reject time off across your team.
        </p>
      </header>

      <LeaveQueue />
    </div>
  );
}

/*
 * `requireRole("MANAGER")` here matches ROUTE_MIN_ROLE in lib/permissions.ts,
 * which already declares /leaves as MANAGER and /leaves/mine as EMPLOYEE. The
 * map drives the sidebar; this call is the actual gate.
 *
 * Both are still courtesy — the backend re-checks. But an employee reaching this
 * URL directly should land somewhere sensible rather than an empty table and a
 * 403 in the console.
 */
