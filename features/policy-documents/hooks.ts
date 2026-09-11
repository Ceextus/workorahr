"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as documentsApi from "./api";
import type { PolicyDocumentFilters } from "./types";

export const policyDocumentKeys = {
  all: ["policy-documents"] as const,
  lists: () => [...policyDocumentKeys.all, "list"] as const,
  list: (filters: PolicyDocumentFilters) =>
    [...policyDocumentKeys.lists(), filters] as const,
};

export function usePolicyDocuments(filters: PolicyDocumentFilters = {}) {
  return useQuery({
    queryKey: policyDocumentKeys.list(filters),
    queryFn: () => documentsApi.listPolicyDocuments(filters),
    placeholderData: (previous) => previous,
  });
}

export function useUploadPolicyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentsApi.uploadPolicyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyDocumentKeys.all });
      toast.success("Document uploaded");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not upload that document");
    },
  });
}

export function useDeletePolicyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentsApi.deletePolicyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyDocumentKeys.all });
      toast.success("Document deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete that document");
    },
  });
}

/*
 * `placeholderData` MATTERS MORE HERE THAN ANYWHERE ELSE IN THE APP.
 *
 * The search box types straight into the query key, so every keystroke is a new
 * cache entry and a new request. Without `placeholderData` the list would blank
 * to a skeleton on each character — the screen flashing while someone types is
 * the single most common search-UI failure.
 *
 * Keeping the previous results visible means the list refines rather than
 * rebuilding. The rows are briefly stale, which is the correct trade for a
 * search.
 *
 * It is not debounced, and it should be. Typing "policy" fires six requests.
 * That is fine against a handful of documents and wrong against a thousand —
 * the fix is a 300ms debounce on the value that reaches the query key, not on
 * the input itself, so typing stays instant.
 */
