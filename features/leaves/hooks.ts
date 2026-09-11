"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as leavesApi from "./api";
import type { LeaveFilters } from "./types";

export const leaveKeys = {
  all: ["leaves"] as const,
  mine: () => [...leaveKeys.all, "mine"] as const,
  queue: (filters: LeaveFilters) => [...leaveKeys.all, "queue", filters] as const,
  detail: (id: string) => [...leaveKeys.all, "detail", id] as const,
};

export const useMyLeaves = () =>
  useQuery({ queryKey: leaveKeys.mine(), queryFn: leavesApi.getMyLeaves });

export function useLeaveQueue(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: leaveKeys.queue(filters),
    queryFn: () => leavesApi.listLeaves(filters),
  });
}

/**
 * Invalidating `leaveKeys.all` is deliberate, and it is the whole lesson of this
 * feature — see the note at the bottom of the file.
 */
function useLeaveMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  successMessage: string,
  fallbackErrorMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || fallbackErrorMessage);
    },
  });
}

export const useSubmitLeave = () =>
  useLeaveMutation(
    leavesApi.submitLeave,
    "Leave request submitted successfully",
    "Failed to submit leave request",
  );
export const useCancelLeave = () =>
  useLeaveMutation(
    leavesApi.cancelLeave,
    "Leave request cancelled",
    "Failed to cancel leave request",
  );
export const useApproveLeave = () =>
  useLeaveMutation(
    leavesApi.approveLeave,
    "Leave request approved",
    "Failed to approve leave request",
  );
export const useRejectLeave = () =>
  useLeaveMutation(
    leavesApi.rejectLeave,
    "Leave request rejected",
    "Failed to reject leave request",
  );

/*
 * WHY EVERY MUTATION INVALIDATES THE WHOLE `leaves` PREFIX
 *
 * Because the same row appears in two caches, and every action touches both.
 *
 *   approve  a manager acts in ["leaves","queue",…] — but the employee's own
 *            ["leaves","mine"] now shows the wrong status.
 *   submit   an employee adds to ["leaves","mine"] — and the manager's PENDING
 *            queue is now missing a row.
 *   cancel   removes it from both.
 *
 * Invalidating only the list you were looking at is the classic bug here: the
 * screen you are on updates, the other one silently goes stale, and it looks
 * correct until someone switches tabs.
 *
 * `all` is a prefix match, so one line covers mine, every filtered queue, and
 * every detail entry. Being more surgical would mean enumerating filter
 * combinations — precision with no benefit on a resource this small.
 *
 * Note this differs from employees, where mutations invalidate only `lists()`
 * and leave detail pages alone. There, a change to one employee cannot affect
 * another. Here, one row genuinely lives in two places.
 */
