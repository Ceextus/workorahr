import { api, asList } from "@/lib/api-client";

import type {
  BookableResource,
  Booking,
  BookingFilters,
  CreateBookingPayload,
  CreateResourcePayload,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Resources — the things that can be booked
// ─────────────────────────────────────────────────────────────────────────────

export const listResources = async () =>
  asList<BookableResource>(
    await api.get("/bookings/resources"),
    "GET /bookings/resources",
  );

export const createResource = (payload: CreateResourcePayload) =>
  api.post<BookableResource>("/bookings/resources", payload);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Bookings
// ─────────────────────────────────────────────────────────────────────────────

export const listBookings = async (filters: BookingFilters = {}) =>
  asList<Booking>(
    await api.get("/bookings", { query: { ...filters } }),
    "GET /bookings",
  );

export const createBooking = (payload: CreateBookingPayload) =>
  api.post<Booking>("/bookings", payload);

/** POST, not DELETE — a cancelled booking stays on the record. */
export const cancelBooking = (id: string) =>
  api.post<void>(`/bookings/${id}/cancel`);

/*
 * TWO RESOURCES BEHIND ONE FEATURE, AND THEY CHANGE AT DIFFERENT RATES.
 *
 * "Conference Room A" is created once and lives for years. A booking of it
 * lasts an hour. So the resource list is cached long and the booking list is
 * not — see the staleTime split in hooks.ts.
 *
 * There is no update or delete for a resource. A room that stops existing can
 * only be left in the list, which will get awkward eventually. Worth raising:
 * every other similar resource in this API (vendors, employees) has at least a
 * deactivate.
 */
