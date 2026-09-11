import { api, asList } from "@/lib/api-client";

import type {
  AssignIncidentPayload,
  CreateOnCallPayload,
  Incident,
  IncidentFilters,
  OnCallAssignment,
  ReportIncidentPayload,
  ResolveIncidentPayload,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Incidents
// ─────────────────────────────────────────────────────────────────────────────

export const listIncidents = async (filters: IncidentFilters = {}) =>
  asList<Incident>(
    await api.get("/incidents", { query: { ...filters } }),
    "GET /incidents",
  );

export const getIncident = (id: string) => api.get<Incident>(`/incidents/${id}`);

export const reportIncident = (payload: ReportIncidentPayload) =>
  api.post<Incident>("/incidents", payload);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export const assignIncident = ({ id, assigneeUserId }: AssignIncidentPayload) =>
  api.post<void>(`/incidents/${id}/assign`, { assigneeUserId });

export const acknowledgeIncident = (id: string) =>
  api.post<void>(`/incidents/${id}/acknowledge`);

export const resolveIncident = ({ id, resolutionNotes }: ResolveIncidentPayload) =>
  api.post<void>(
    `/incidents/${id}/resolve`,
    // "Body is optional" — so send nothing at all rather than an empty object.
    resolutionNotes?.trim() ? { resolutionNotes: resolutionNotes.trim() } : undefined,
  );

export const closeIncident = (id: string) => api.post<void>(`/incidents/${id}/close`);

/*
 * FIVE ENDPOINTS FOR ONE STATE MACHINE
 *
 *   report      → OPEN
 *   acknowledge → ACKNOWLEDGED   someone has picked this up
 *   resolve     → RESOLVED       the problem is fixed
 *   close       → CLOSED         the paperwork is done
 *
 * `assign` is orthogonal — it can happen at any point and does not move the
 * status, which is why it is not in that ladder.
 *
 * Every one of them is POST. Compare features/leaves/api.ts, where approve and
 * reject are PUT. Same shape of operation, different verb, and the only way to
 * know is to read the docs rather than pattern-match from the neighbouring
 * feature.
 *
 * WHY `resolveIncident` SENDS `undefined` RATHER THAN `{}`
 *
 * The docs say the body is optional. `{}` is not "no body" — it is a JSON
 * object with no fields, and a Spring DTO with a non-null constraint will
 * reject it differently from an absent body. Passing `undefined` makes
 * api-client omit the body entirely, which is what "optional" actually means.
 * Same reasoning as the expense approve/reject notes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · On-call
// ─────────────────────────────────────────────────────────────────────────────

/** Upcoming roster. */
export const listOnCall = async () =>
  asList<OnCallAssignment>(
    await api.get("/incidents/on-call"),
    "GET /incidents/on-call",
  );

/** Whoever is on call right now. May legitimately be empty. */
export const getCurrentOnCall = () =>
  api.get<OnCallAssignment | null>("/incidents/on-call/current");

export const createOnCall = (payload: CreateOnCallPayload) =>
  api.post<OnCallAssignment>("/incidents/on-call", payload);

export const deleteOnCall = (id: string) =>
  api.delete<void>(`/incidents/on-call/${id}`);

/*
 * `/incidents/on-call/current` IS NOT PUT THROUGH `asList`, AND THAT IS THE
 * DIFFERENCE BETWEEN THE TWO READS.
 *
 * The roster is a list of upcoming assignments. "Current" is a single
 * assignment, or nobody — a gap in coverage is a real and important state, not
 * an error. So its type is `OnCallAssignment | null` and the UI treats null as
 * "nobody is on call", which is exactly the thing an ops dashboard exists to
 * make visible.
 *
 * Running it through `asList` would coerce that meaningful null into `[]` and
 * lose the distinction between "no coverage" and "failed to load".
 */
