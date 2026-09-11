"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as incidentsApi from "./api";
import type { IncidentFilters } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Keys
// ─────────────────────────────────────────────────────────────────────────────

export const incidentKeys = {
  all: ["incidents"] as const,
  lists: () => [...incidentKeys.all, "list"] as const,
  list: (filters: IncidentFilters) => [...incidentKeys.lists(), filters] as const,
  details: () => [...incidentKeys.all, "detail"] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  onCall: () => [...incidentKeys.all, "on-call"] as const,
  onCallCurrent: () => [...incidentKeys.onCall(), "current"] as const,
};

/*
 * `onCallCurrent()` is built FROM `onCall()`, so it is
 * ["incidents","on-call","current"] — a child of the roster key rather than a
 * sibling. Invalidation matches by prefix, so creating an assignment
 * invalidates the roster and "who is on call right now" in one go, which is
 * correct: adding a rota entry that starts today changes both answers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Reads
// ─────────────────────────────────────────────────────────────────────────────

export function useIncidents(filters: IncidentFilters = {}) {
  return useQuery({
    queryKey: incidentKeys.list(filters),
    queryFn: () => incidentsApi.listIncidents(filters),
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => incidentsApi.getIncident(id),
    enabled: Boolean(id),
  });
}

export function useOnCallRoster() {
  return useQuery({
    queryKey: incidentKeys.onCall(),
    queryFn: incidentsApi.listOnCall,
  });
}

export function useCurrentOnCall() {
  return useQuery({
    queryKey: incidentKeys.onCallCurrent(),
    queryFn: incidentsApi.getCurrentOnCall,
    // Who is on call changes on a rota boundary, not continuously.
    staleTime: 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Writes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every lifecycle action does the same two things on success, so they share a
 * factory rather than repeating the same eight lines five times.
 *
 * `ops-pulse` is invalidated too: GET /ops-pulse returns `openIncidents` and
 * `criticalIncidents`, so acknowledging or closing something here changes a
 * number the dashboard is displaying. Without this the dashboard keeps showing
 * a stale count until it happens to refetch, and the two screens disagree.
 */
function useIncidentAction<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ops-pulse"] });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || failureMessage);
    },
  });
}

export const useReportIncident = () =>
  useIncidentAction(
    incidentsApi.reportIncident,
    "Incident reported",
    "Could not report that incident",
  );

export const useAssignIncident = () =>
  useIncidentAction(
    incidentsApi.assignIncident,
    "Incident assigned",
    "Could not assign that incident",
  );

export const useAcknowledgeIncident = () =>
  useIncidentAction(
    incidentsApi.acknowledgeIncident,
    "Incident acknowledged",
    "Could not acknowledge that incident",
  );

export const useResolveIncident = () =>
  useIncidentAction(
    incidentsApi.resolveIncident,
    "Incident resolved",
    "Could not resolve that incident",
  );

export const useCloseIncident = () =>
  useIncidentAction(
    incidentsApi.closeIncident,
    "Incident closed",
    "Could not close that incident",
  );

export const useCreateOnCall = () =>
  useIncidentAction(
    incidentsApi.createOnCall,
    "On-call assignment created",
    "Could not create that assignment",
  );

export const useDeleteOnCall = () =>
  useIncidentAction(
    incidentsApi.deleteOnCall,
    "On-call assignment removed",
    "Could not remove that assignment",
  );

/*
 * INVALIDATING `incidentKeys.all` IS BLUNT ON PURPOSE.
 *
 * Elsewhere — employees, leaves — invalidation is narrowed to `lists()` or a
 * single `detail(id)`, because those lists are long and refetching everything
 * is wasteful.
 *
 * Incidents are different in two ways. The lifecycle actions change `status`,
 * which is a *filter*, so acknowledging an incident moves it between the OPEN
 * and ACKNOWLEDGED cache entries — both need refetching, and a narrow
 * invalidation would leave it visible under a filter it no longer matches.
 * And an incident queue is small: a company with a thousand open incidents has
 * a bigger problem than a redundant request.
 *
 * `["ops-pulse"]` is written as a literal rather than importing `opsPulseKeys`.
 * That is deliberate — importing the ops-pulse hooks module here would pull a
 * second feature's client code into every page that touches incidents, to read
 * a two-element array. The literal is checked against opsPulseKeys.all in
 * features/ops-pulse/hooks.ts, and if either changes the invalidation silently
 * stops working, which is the honest cost of the shortcut.
 */
