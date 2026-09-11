"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as schedulingApi from "./api";
import type { RosterRange, SwapStatus } from "./types";

export const schedulingKeys = {
  all: ["scheduling"] as const,
  shifts: () => [...schedulingKeys.all, "shifts"] as const,
  roster: (range: RosterRange) => [...schedulingKeys.all, "roster", range] as const,
  onDuty: () => [...schedulingKeys.all, "on-duty"] as const,
  swaps: () => [...schedulingKeys.all, "swaps"] as const,
  swapList: (status: SwapStatus | "") => [...schedulingKeys.swaps(), status] as const,
};

export function useShifts() {
  return useQuery({
    queryKey: schedulingKeys.shifts(),
    queryFn: schedulingApi.listShifts,
    // Shift templates change about once a year.
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoster(range: RosterRange) {
  return useQuery({
    queryKey: schedulingKeys.roster(range),
    queryFn: () => schedulingApi.getRoster(range),
    placeholderData: (previous) => previous,
  });
}

export function useOnDuty() {
  return useQuery({
    queryKey: schedulingKeys.onDuty(),
    queryFn: schedulingApi.getOnDuty,
    staleTime: 60 * 1000,
  });
}

export function useSwapRequests(status: SwapStatus | "" = "") {
  return useQuery({
    queryKey: schedulingKeys.swapList(status),
    queryFn: () => schedulingApi.listSwapRequests(status ? { status } : {}),
    placeholderData: (previous) => previous,
  });
}

function useSchedulingAction<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || failureMessage);
    },
  });
}

export const useCreateShift = () =>
  useSchedulingAction(
    schedulingApi.createShift,
    "Shift created",
    "Could not create that shift",
  );

export const useAssignShift = () =>
  useSchedulingAction(
    schedulingApi.assignShift,
    "Shift assigned",
    "Could not assign that shift",
  );

export const useRemoveAssignment = () =>
  useSchedulingAction(
    schedulingApi.removeAssignment,
    "Assignment removed",
    "Could not remove that assignment",
  );

export const useCreateSwapRequest = () =>
  useSchedulingAction(
    schedulingApi.createSwapRequest,
    "Swap requested",
    "Could not request that swap",
  );

export const useApproveSwap = () =>
  useSchedulingAction(
    schedulingApi.approveSwapRequest,
    "Swap approved",
    "Could not approve that swap",
  );

export const useRejectSwap = () =>
  useSchedulingAction(
    schedulingApi.rejectSwapRequest,
    "Swap rejected",
    "Could not reject that swap",
  );

export const useCancelSwap = () =>
  useSchedulingAction(
    schedulingApi.cancelSwapRequest,
    "Swap cancelled",
    "Could not cancel that swap",
  );

/*
 * ONE INVALIDATION KEY FOR THE WHOLE FEATURE, AND HERE IT IS GENUINELY
 * NECESSARY RATHER THAN CONVENIENT.
 *
 * Approving a swap rewrites the roster — that is the entire point of a swap. So
 * a mutation that looks like it only touches `swaps` also changes `roster` and
 * `on-duty`. Invalidating narrowly would leave the roster showing the person
 * who is no longer working that shift, which is the one thing this feature
 * exists to get right.
 *
 * The roster key includes its date range, so every window viewed this session
 * is a separate cache entry. `schedulingKeys.all` catches all of them without
 * anyone having to work out which windows an approved swap fell into.
 */
