import type { Metadata } from "next";

import { BookingBoard } from "@/features/bookings/components/booking-board";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Bookings · Workora",
};

export default async function BookingsPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Bookings</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Reserve rooms and shared resources.
        </p>
      </header>

      <BookingBoard canManageResources={isHR(user?.userType)} />
    </div>
  );
}

/*
 * BOOKING IS OPEN; CREATING THE THINGS THAT CAN BE BOOKED IS NOT.
 *
 * Anyone can reserve a room — a booking system that needed permission to use
 * would not be used. But "Conference Room A" existing at all is a facilities
 * decision, and a resource list anyone can append to fills up with duplicates
 * and jokes within a week.
 *
 * Neither rule is in the docs; both are this app's policy. The backend decides
 * for real.
 */
