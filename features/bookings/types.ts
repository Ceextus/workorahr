export interface BookableResource {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
}

export interface Booking {
  id: string;
  resourceId: string;
  title: string;
  /** OffsetDateTime, e.g. 2026-09-08T09:00:00Z */
  startsAt: string;
  endsAt: string;

  /* Undocumented response fields — rendered when present, skipped when not. */
  resourceName?: string | null;
  bookedByEmployeeId?: string | null;
  bookedByName?: string | null;
  status?: string | null;
  cancelled?: boolean | null;
}

export interface BookingFilters {
  resourceId?: string;
  /** Both are OffsetDateTime strings. */
  start?: string;
  end?: string;
}

export interface CreateResourcePayload {
  name: string;
  description?: string;
  capacity?: number;
}

export interface CreateBookingPayload {
  resourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

export function isCancelled(booking: Booking): boolean {
  if (typeof booking.cancelled === "boolean") return booking.cancelled;
  if (booking.status) return booking.status.toUpperCase() === "CANCELLED";
  return false;
}

/** Has this booking already finished? */
export function hasEnded(booking: Booking): boolean {
  const end = new Date(booking.endsAt).getTime();
  if (Number.isNaN(end)) return false;
  return end < Date.now();
}

/*
 * THE `start`/`end` FILTERS ARE OffsetDateTime, NOT PLAIN DATES.
 *
 * The docs are explicit: "start and end (OffsetDateTime, e.g.
 * 2026-09-01T00:00:00Z)". So a `<input type="date">` value of "2026-09-01"
 * cannot be sent as-is — it has no time and no zone, and Spring will refuse to
 * bind it.
 *
 * The day picker in the UI therefore converts: the chosen day becomes local
 * midnight → `toISOString()`, and the end becomes local midnight the following
 * day. Which also means "today" is the viewer's today, not the server's — the
 * correct behaviour for a room booking, and the reason this is worth spelling
 * out rather than passing the raw input value through.
 */
