import { api, asList } from "@/lib/api-client";

import type {
  CreateVendorPayload,
  UpdateVendorPayload,
  Vendor,
  VendorFilters,
} from "./types";

export const listVendors = async (filters: VendorFilters = {}) =>
  asList<Vendor>(
    await api.get("/vendors", { query: { ...filters } }),
    "GET /vendors",
  );

export const createVendor = (payload: CreateVendorPayload) =>
  api.post<Vendor>("/vendors", payload);

/** Partial — only non-null fields are applied. */
export const updateVendor = ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateVendorPayload;
}) => api.put<Vendor>(`/vendors/${id}`, payload);

export const activateVendor = (id: string) =>
  api.post<void>(`/vendors/${id}/activate`);

export const deactivateVendor = (id: string) =>
  api.post<void>(`/vendors/${id}/deactivate`);

/*
 * THERE IS NO DELETE, AND THAT IS CORRECT FOR THIS RESOURCE.
 *
 * Deactivate is the whole lifecycle. A vendor with two years of history behind
 * it cannot be removed without orphaning that history, so the API offers
 * activate/deactivate instead — the same soft-delete shape as
 * DELETE /employees/{id}, which the docs describe as "flips active=false".
 *
 * Which means the UI must never say "Delete". It says "Deactivate", because
 * that is what happens, and a button labelled delete that does not delete is
 * how people end up believing data is gone when it is not.
 */
