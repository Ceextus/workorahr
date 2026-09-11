import type { Metadata } from "next";

import { AttendanceRoster } from "@/features/attendance/components/attendance-roster";
import { CheckInCard } from "@/features/attendance/components/check-in-card";
import { MyAttendance } from "@/features/attendance/components/my-attendance";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Attendance · Workora",
};

export default async function AttendancePage() {
  const user = await getSession();
  const canSeeEveryone = isHR(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Attendance</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Check in and out, and see your recorded days.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CheckInCard />
        </div>
        <div className="lg:col-span-2">
          <MyAttendance />
        </div>
      </div>

      {canSeeEveryone ? (
        <section className="flex flex-col gap-4 border-t border-border-subtle pt-6">
          <div>
            <h2 className="text-h5 text-text-strong">Everyone</h2>
            <p className="mt-1 text-body-md text-text-muted">
              Attendance across the company for a given day.
            </p>
          </div>
          <AttendanceRoster />
        </section>
      ) : null}
    </div>
  );
}

/*
 * ONE ROUTE, TWO AUDIENCES — UNLIKE LEAVES.
 *
 * Leave is split across /leaves and /leaves/mine because the two views answer
 * genuinely different questions: one is a queue you act on, the other a history
 * you submit to.
 *
 * Attendance is not like that. Everybody clocks in, including HR, and the
 * company roster is extra context on the same subject rather than a separate
 * job. Splitting it would mean HR bouncing between two routes to do one thing.
 *
 * So the personal half always renders and the roster is appended for HR/Admin.
 * `isHR` gating is courtesy — GET /attendance is HR/Admin server-side, and
 * `useAttendance` sets `retry: false` so a 403 settles immediately rather than
 * being retried three times.
 */
