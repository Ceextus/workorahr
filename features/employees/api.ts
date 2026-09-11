import { api, asList } from "@/lib/api-client";

import type {
  CreateEmployeePayload,
  Employee,
  EmployeeFilters,
  UpdateEmployeePayload,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Reads
// ─────────────────────────────────────────────────────────────────────────────

export const listEmployees = async (filters: EmployeeFilters = {}) =>
  asList<Employee>(
    await api.get("/employees", { query: { ...filters } }),
    "GET /employees",
  );

export const getEmployee = (id: string) => api.get<Employee>(`/employees/${id}`);

export const getMyProfile = () => api.get<Employee>("/employees/me");

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Writes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [HR+] Creates the employee AND their login. The backend generates a password
 * and emails it; it is never in this response.
 */
export const createEmployee = (payload: CreateEmployeePayload) =>
  api.post<Employee>("/employees", payload);

/** [HR+] Partial update. Returns no body — see the note below. */
export const updateEmployee = (id: string, payload: UpdateEmployeePayload) =>
  api.put<void>(`/employees/${id}`, payload);

/** [HR+] Soft delete: flips active=false and locks the login. No body. */
export const deactivateEmployee = (id: string) => api.delete<void>(`/employees/${id}`);

/** [HR+] No body. */
export const reactivateEmployee = (id: string) =>
  api.post<void>(`/employees/${id}/activate`);

/*
 * THREE OF THESE FOUR RETURN NOTHING.
 *
 * Update, activate and deactivate all answer with an empty body. That is a
 * behavioural change worth noticing, because the obvious way to write a
 * mutation hook is:
 *
 *   onSuccess: (updated) => queryClient.setQueryData(detail(updated.id), updated)
 *
 * ...which throws "Cannot read properties of undefined (reading 'id')" the
 * moment there is no response to read. When the server returns nothing, the
 * only way to refresh the cache is to refetch — see hooks.ts.
 *
 * It also means the second argument to `onSuccess` (the mutation variables) is
 * the only way to know *which* employee an operation applied to.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Profile picture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * multipart/form-data. Updates the *authenticated* user's picture only —
 * there is no endpoint for changing someone else's. Returns no body.
 */
export const uploadProfilePicture = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return api.post<void>("/employees/me/profile-picture", body);
};

/*
 * The FormData is built here so no component has to know the field is called
 * "file".
 *
 * And note what is absent: a Content-Type header. `apiFetch` detects FormData
 * and deliberately omits it, so the browser sets `multipart/form-data` with the
 * boundary marker itself. Setting it by hand is the upload bug from Phase 00 —
 * the backend cannot find where each part begins and answers 400.
 *
 * Because this returns no body, the updated `profilePictureUrl` has to come
 * from a refetch of the employee record.
 */
