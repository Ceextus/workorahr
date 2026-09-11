"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as vendorsApi from "./api";
import type { VendorFilters } from "./types";

export const vendorKeys = {
  all: ["vendors"] as const,
  lists: () => [...vendorKeys.all, "list"] as const,
  list: (filters: VendorFilters) => [...vendorKeys.lists(), filters] as const,
};

export function useVendors(filters: VendorFilters = {}) {
  return useQuery({
    queryKey: vendorKeys.list(filters),
    queryFn: () => vendorsApi.listVendors(filters),
    retry: false,
    placeholderData: (previous) => previous,
  });
}

function useVendorAction<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || failureMessage);
    },
  });
}

export const useCreateVendor = () =>
  useVendorAction(vendorsApi.createVendor, "Vendor added", "Could not add that vendor");

export const useUpdateVendor = () =>
  useVendorAction(vendorsApi.updateVendor, "Vendor updated", "Could not update that vendor");

export const useActivateVendor = () =>
  useVendorAction(vendorsApi.activateVendor, "Vendor activated", "Could not activate that vendor");

export const useDeactivateVendor = () =>
  useVendorAction(vendorsApi.deactivateVendor, "Vendor deactivated", "Could not deactivate that vendor");

/*
 * `vendorKeys.all` ON EVERY MUTATION, AND HERE IT IS NOT LAZINESS.
 *
 * `status` is a filter AND the thing activate/deactivate changes. Deactivating
 * a vendor while the "Active" filter is applied moves that row out of the
 * current list and into one this component is not looking at. Only the parent
 * key covers both.
 *
 * `placeholderData` KEEPS THE OLD ROWS DURING A FILTER CHANGE
 *
 * Same as `useEmployees`. Switching from Active to Inactive would otherwise
 * blank the table for a beat, which reads as "there are none" right before the
 * real answer arrives.
 */
