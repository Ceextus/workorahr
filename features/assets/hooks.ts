"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as assetsApi from "./api";

export const assetKeys = {
  all: ["assets"] as const,
  list: () => [...assetKeys.all, "list"] as const,
  mine: () => [...assetKeys.all, "mine"] as const,
};

export function useAssets({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: assetKeys.list(),
    queryFn: assetsApi.listAssets,
    enabled,
    // A 403 for a non-HR caller is a settled answer, not a transient failure.
    retry: false,
  });
}

export function useMyAssets() {
  return useQuery({
    queryKey: assetKeys.mine(),
    queryFn: assetsApi.getMyAssets,
  });
}

/**
 * Assign and return both move an asset between the register and somebody's
 * personal list, so both cache entries are always invalidated together.
 */
function useAssetAction<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || failureMessage);
    },
  });
}

export const useCreateAsset = () =>
  useAssetAction(assetsApi.createAsset, "Asset added", "Could not add that asset");

export const useAssignAsset = () =>
  useAssetAction(assetsApi.assignAsset, "Asset assigned", "Could not assign that asset");

export const useReturnAsset = () =>
  useAssetAction(assetsApi.returnAsset, "Asset returned", "Could not return that asset");

/*
 * `assetKeys.all` RATHER THAN THE INDIVIDUAL LISTS, FOR ONE SPECIFIC REASON.
 *
 * Assigning an asset changes two answers at once: it leaves the "unassigned"
 * half of the register and appears on someone's /assets/mine. If that someone
 * is the current user, both queries on screen are now wrong.
 *
 * Invalidating the parent key catches both without the caller having to know
 * whether they just assigned something to themselves.
 *
 * `retry: false` ON THE REGISTER
 *
 * GET /assets is HR/Admin only. Without this, an EMPLOYEE who somehow reaches
 * it retries a guaranteed 403 three times with backoff before giving up — three
 * requests and several seconds to reach a conclusion the first response already
 * gave. Same setting as `useExpenseQueue` for the same reason.
 */
