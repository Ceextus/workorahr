"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import * as employeesApi from "./api";
import type { EmployeeFilters, UpdateEmployeePayload } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Keys
// ─────────────────────────────────────────────────────────────────────────────

export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  me: () => [...employeeKeys.all, "me"] as const,
};

/*
 * THE FILTERS ARE PART OF THE KEY. THIS IS THE LESSON OF PHASE 06.
 *
 * A query key is the cache's address. Leave the filters out of it and every
 * filter combination shares one address:
 *
 *   ["employees","list"]                        <- Engineering results land here
 *   ["employees","list"]                        <- ...and Sales reads them back
 *
 * TanStack would serve the cached Engineering rows for a Sales request and never
 * refetch, because as far as it can tell you already asked that question. The
 * symptom is a dropdown that appears to do nothing, or worse, shows the previous
 * department's people under the new label.
 *
 * With the filters in the key, each combination is its own entry, changing a
 * filter is a cache miss, and the refetch happens automatically. There is no
 * `useEffect` anywhere in this file — changing the key IS the refetch.
 *
 * TanStack hashes keys structurally, so `{active:true, jobTitle:"x"}` and
 * `{jobTitle:"x", active:true}` are the same key. Property order does not matter;
 * values do.
 *
 * THE LADDER OF KEYS
 *
 * `all` -> `lists` -> `list(filters)`, and `all` -> `details` -> `detail(id)`.
 * Because invalidation matches by prefix, each rung is a useful blast radius:
 *
 *   invalidate(detail(id))   just that person
 *   invalidate(lists())      every filtered list, no detail pages
 *   invalidate(all)          everything employee-shaped
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Reads
// ─────────────────────────────────────────────────────────────────────────────

export function useEmployees(
  filters: EmployeeFilters = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeesApi.listEmployees(filters),
    enabled,
    // Keeps the previous rows on screen while the new filter loads.
    placeholderData: (previous) => previous,
  });
}

/*
 * `enabled` was added when the asset register needed the employee list only for
 * HR viewers. Both parameters default, so every existing call site —
 * `useEmployees()`, `useEmployees(filters)` — is untouched.
 *
 * It matters because this query is not free: it fetches the whole directory.
 * A component that renders it conditionally should not pay for it
 * unconditionally, and `enabled: false` means the request is never made rather
 * than made and discarded.
 */

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.getEmployee(id),
    enabled: Boolean(id),
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: employeeKeys.me(),
    queryFn: employeesApi.getMyProfile,
  });
}

/**
 * `employeeId` -> "First Last", for the many records that carry an id and no name.
 *
 * Attendance records, leave requests and expense claims all reference employees
 * by UUID only. A screen showing a queue of UUIDs is unusable, so this fetches
 * the directory once and builds a lookup.
 *
 * Cheap for three reasons: one request rather than one per row, the employees
 * query is shared with every other caller, and the Map is memoised so it is
 * rebuilt only when the list itself changes.
 *
 * Returns `isLoading` too, so callers can tell "no name yet" from "no such
 * employee" — the first is a skeleton, the second a deactivated person who has
 * dropped out of the list.
 */
export function useEmployeeNameMap() {
  const { data, isLoading } = useEmployees();

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of data ?? []) {
      map.set(employee.id, `${employee.firstName} ${employee.lastName}`);
    }
    return map;
  }, [data]);

  return { nameById, employees: data, isLoading };
}

/**
 * `userId` -> "First Last", for the records that identify people by their
 * linked *user* account rather than by employee id.
 *
 * Board members, incident assignees and on-call assignments all do that. Each
 * of those responses may or may not include a display name; when it does not,
 * the UI was rendering a raw 36-character UUID at somebody.
 *
 * Same shape and same cost as `useEmployeeNameMap` — one shared request for the
 * directory, memoised into a Map — just keyed on the other id.
 */
export function useUserNameMap() {
  const { data, isLoading } = useEmployees();

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of data ?? []) {
      if (employee.userId) {
        map.set(employee.userId, `${employee.firstName} ${employee.lastName}`);
      }
    }
    return map;
  }, [data]);

  /**
   * A display name for a user, best source first:
   * the name the response gave us, then the directory, then the raw id.
   *
   * Returning the id as a last resort rather than null is deliberate — an
   * unreadable identifier still identifies, and "—" would lose information the
   * caller might need to chase something down.
   */
  const resolveUser = (
    providedName: string | null | undefined,
    userId: string | null | undefined,
  ): string | null => {
    if (providedName) return providedName;
    if (!userId) return null;
    return nameByUserId.get(userId) ?? userId;
  };

  return { nameByUserId, isLoading, resolveUser };
}

/*
 * `placeholderData: (previous) => previous` IS WORTH UNDERSTANDING
 *
 * Without it, changing a filter empties `data` while the request is in flight.
 * The table collapses to a skeleton, the page height jumps, and it comes back a
 * moment later. Every keystroke in a search box does that.
 *
 * With it, the old rows stay put and `isPlaceholderData` goes true, so you can
 * dim them slightly instead. The table stops flickering and starts feeling like
 * it is filtering rather than reloading.
 *
 * This is not the same as a skeleton, and it does not replace one. First load
 * has nothing previous to show and still needs the skeleton — see
 * employee-table.tsx, which handles both.
 *
 * `enabled: Boolean(id)` stops a request firing with an empty id while a route
 * param is still resolving. A disabled query stays in `isPending` rather than
 * failing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Writes
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success("Employee created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create employee");
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) =>
      employeesApi.updateEmployee(id, payload),
    // No response body, so `id` comes from the variables, not the result.
    onSuccess: (_empty, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success("Employee updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update employee");
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.deactivateEmployee,
    onSuccess: (_empty, id) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success("Employee deactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate employee");
    },
  });
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.reactivateEmployee,
    onSuccess: (_empty, id) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success("Employee reactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reactivate employee");
    },
  });
}

export function useUploadProfilePicture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeesApi.uploadProfilePicture,
    // The new URL is only visible after a refetch — the upload returns nothing.
    //
    // `all` rather than `me()` alone, because the same picture is now rendered
    // from three different cache entries: the topbar and settings read
    // ["employees","me"], the directory reads a list, and your own profile page
    // reads ["employees","detail",id]. Invalidating only `me` leaves the other
    // two showing the old picture until something else happens to refetch them.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Profile picture updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload profile picture");
    },
  });
}

/*
 * A BUG THE BACKEND UPDATE INTRODUCED, AND WHERE IT WAS
 *
 * These four used to read the mutation's *result*:
 *
 *   onSuccess: (updated) => setQueryData(detail(updated.id), updated)
 *
 * That was right when update and activate returned the saved employee. They now
 * return an empty body, so `updated` is `undefined` and this throws
 * "Cannot read properties of undefined (reading 'id')" — after the write has
 * already succeeded on the server, which is the confusing part. The data is
 * saved; the UI reports a crash.
 *
 * `onSuccess` takes a second argument: the variables the mutation was called
 * with. When the server tells you nothing, that is the only place the id exists.
 *
 * The general rule: `setQueryData` needs a response to write. Without one,
 * invalidate and let the refetch tell you what actually happened. That is
 * slower by one round-trip and correct, which is the right trade for a write.
 */

/*
 * WHY MUTATIONS INVALIDATE `lists()` AND NOT `all`
 *
 * `all` would also throw away every detail page in the cache. Creating a new
 * employee cannot change anyone else's record, so evicting them means the next
 * visit to a colleague's page shows a spinner for no reason.
 *
 * Be as specific as the change actually is. `lists()` is exactly the set that a
 * new row belongs in.
 *
 * WHY UPDATES USE setQueryData *AND* invalidateQueries
 *
 * Two different caches to reconcile, and only one of them has the answer.
 *
 *   the detail   the response IS the updated employee, so write it straight in.
 *                Instant, no round-trip, no loading flash on the page you are
 *                looking at.
 *
 *   the lists    the change may have moved this person in or out of a filtered
 *                list — rename them, change their department, and the
 *                "Engineering" list is now wrong in a way this response cannot
 *                tell us. Refetching is the only correct answer.
 *
 * WHY DEACTIVATE ONLY INVALIDATES
 *
 * It responds 204 with no body, so there is no updated record to write in. Note
 * the second argument to `onSuccess` — for a 204, the mutation variables are the
 * only way to know *which* employee this was.
 *
 * WHY `useUpdateEmployee` TAKES AN OBJECT
 *
 * `useMutation` passes exactly one argument to `mutationFn`. Two-parameter API
 * functions have to be wrapped, so the hook takes `{ id, payload }`. Slightly
 * more to type at the call site, and it keeps api.ts's signature natural for
 * server-side callers.
 */
