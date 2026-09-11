"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import * as departmentsApi from "./api";
import type { DepartmentPayload } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Keys
// ─────────────────────────────────────────────────────────────────────────────

export const departmentKeys = {
  all: ["departments"] as const,
  list: () => [...departmentKeys.all, "list"] as const,
  detail: (id: string) => [...departmentKeys.all, "detail", id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Read
// ─────────────────────────────────────────────────────────────────────────────

export function useDepartments() {
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: departmentsApi.listDepartments,
    // Departments change rarely, and the employee filter reads this on every
    // visit. Five minutes of freshness avoids a refetch per mount.
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentNameMap() {
  const { data, isLoading } = useDepartments();

  const departmentById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of data ?? []) {
      const anyD = d as unknown as Record<string, unknown>;
      const id = String(d.id || anyD.departmentId || anyD._id || "").trim();
      const name = String(d.name || anyD.departmentName || anyD.title || "").trim();
      if (id && name) {
        map.set(id, name);
        map.set(id.toLowerCase(), name);
      }
    }
    return map;
  }, [data]);

  return { departmentById, departments: data, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Writes
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: departmentsApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success("Department created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create department");
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentPayload }) =>
      departmentsApi.updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success("Department updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update department");
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: departmentsApi.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success("Department deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });
}

/*
 * WHY THESE ARE WRITTEN OUT RATHER THAN GENERATED
 *
 * The first version of this file had one clever helper that wrapped any api
 * function and spread its arguments. It worked, and it forced every call site to
 * pass an array:
 *
 *   update.mutate([id, payload])     // what is [0]? what is [1]?
 *
 * `useMutation` only ever passes one argument to `mutationFn`, so multi-argument
 * API functions have to be adapted somehow. An object does the same job and
 * says what the parts are:
 *
 *   update.mutate({ id, payload })
 *
 * Three near-identical functions is the right amount of repetition here. The
 * abstraction saved eight lines and cost every reader a moment of decoding.
 *
 * WHY ALL THREE INVALIDATE `all` RATHER THAN `list()`
 *
 * Unlike employees, this resource is small and fully denormalised — there are no
 * filtered lists to be selective about, and a rename changes both the list and
 * that department's detail entry. `all` is a prefix match, so one line covers
 * both. Being more surgical here would be precision without benefit.
 *
 * NOTE WHAT DELETE DOES *NOT* DO
 *
 * It responds 204 with no body, so there is no updated record to write into the
 * cache — refetching is the only option. That is the same 204 handling
 * api-client.ts was built for in Phase 00: `.json()` on an empty body throws.
 */
