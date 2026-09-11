"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as bookingsApi from "./api";
import type { BookingFilters } from "./types";

export const bookingKeys = {
  all: ["bookings"] as const,
  resources: () => [...bookingKeys.all, "resources"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (filters: BookingFilters) => [...bookingKeys.lists(), filters] as const,
};

export function useResources() {
  return useQuery({
    queryKey: bookingKeys.resources(),
    queryFn: bookingsApi.listResources,
    // Rooms do not appear and disappear during a session.
    staleTime: 5 * 60 * 1000,
  });
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => bookingsApi.listBookings(filters),
    placeholderData: (previous) => previous,
  });
}

function useBookingAction<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || failureMessage);
    },
  });
}

export const useCreateResource = () =>
  useBookingAction(
    bookingsApi.createResource,
    "Resource added",
    "Could not add that resource",
  );

export const useCreateBooking = () =>
  useBookingAction(bookingsApi.createBooking, "Booked", "Could not make that booking");

export const useCancelBooking = () =>
  useBookingAction(bookingsApi.cancelBooking, "Booking cancelled", "Could not cancel that booking");

/*
 * A DOUBLE BOOKING WILL BE REJECTED BY THE SERVER, AND THAT IS THE ONLY CHECK
 * THAT COUNTS.
 *
 * The UI shows what is already booked for the chosen day, which helps someone
 * pick a free slot. It deliberately does NOT try to validate the overlap before
 * submitting.
 *
 * Two reasons. The list on screen is a snapshot — somebody else can book the
 * same room in the seconds between it loading and the form being submitted, so
 * a client-side check can be confidently wrong. And the rule itself is the
 * server's: whether back-to-back bookings touch, whether a cancelled booking
 * frees the slot, whether capacity matters. Reimplementing that here means two
 * definitions of "available" that will eventually disagree.
 *
 * So the form submits, and a 409 or 400 surfaces through the error toast.
 */
