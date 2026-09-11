"use client";

import { useQuery } from "@tanstack/react-query";

import { getOpsPulse } from "./api";

export const opsPulseKeys = {
  all: ["ops-pulse"] as const,
};

export function useOpsPulse() {
  return useQuery({
    queryKey: opsPulseKeys.all,
    queryFn: getOpsPulse,
    // Operational counts go stale quickly — refresh when the tab regains focus.
    staleTime: 30 * 1000,
  });
}
