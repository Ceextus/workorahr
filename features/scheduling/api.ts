import { api, asList } from "@/lib/api-client";

import type {
  ApproveSwapPayload,
  AssignShiftPayload,
  CreateShiftPayload,
  CreateSwapPayload,
  RosterAssignment,
  RosterRange,
  Shift,
  SwapRequest,
  SwapStatus,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Shifts — the templates
// ─────────────────────────────────────────────────────────────────────────────

export const listShifts = async () =>
  asList<Shift>(await api.get("/scheduling/shifts"), "GET /scheduling/shifts");

export const createShift = (payload: CreateShiftPayload) =>
  api.post<Shift>("/scheduling/shifts", payload);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The roster — who works which shift on which day
// ─────────────────────────────────────────────────────────────────────────────

export const getRoster = async (range: RosterRange) =>
  asList<RosterAssignment>(
    await api.get("/scheduling/roster", { query: { ...range } }),
    "GET /scheduling/roster",
  );

export const assignShift = (payload: AssignShiftPayload) =>
  api.post<RosterAssignment>("/scheduling/roster", payload);

export const removeAssignment = (id: string) =>
  api.delete<void>(`/scheduling/roster/${id}`);

/** Whoever is working right now. */
export const getOnDuty = async () =>
  asList<RosterAssignment>(
    await api.get("/scheduling/on-duty"),
    "GET /scheduling/on-duty",
  );

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Swap requests
// ─────────────────────────────────────────────────────────────────────────────

export const listSwapRequests = async (filters: { status?: SwapStatus } = {}) =>
  asList<SwapRequest>(
    await api.get("/scheduling/swap-requests", { query: { ...filters } }),
    "GET /scheduling/swap-requests",
  );

export const createSwapRequest = (payload: CreateSwapPayload) =>
  api.post<SwapRequest>("/scheduling/swap-requests", payload);

export const approveSwapRequest = ({ id, replacementEmployeeId }: ApproveSwapPayload) =>
  api.post<void>(
    `/scheduling/swap-requests/${id}/approve`,
    replacementEmployeeId ? { replacementEmployeeId } : undefined,
  );

export const rejectSwapRequest = (id: string) =>
  api.post<void>(`/scheduling/swap-requests/${id}/reject`);

export const cancelSwapRequest = (id: string) =>
  api.post<void>(`/scheduling/swap-requests/${id}/cancel`);

/*
 * REJECT AND CANCEL ARE DIFFERENT VERBS FOR DIFFERENT PEOPLE.
 *
 * Cancel is the requester withdrawing their own request. Reject is a manager
 * refusing it. The API keeps them apart, so the UI must too — collapsing them
 * into one "Decline" button would let someone cancel a colleague's request and
 * have it recorded as their own change of mind.
 *
 * Same distinction as leaves: DELETE /leaves/{id} is the employee cancelling,
 * PUT /leaves/{id}/reject is the manager refusing. That the leave pair uses
 * DELETE and PUT while this one uses POST for both is exactly the sort of
 * inconsistency worth reading the docs for rather than assuming.
 *
 * `replacementEmployeeId` IS CONDITIONALLY REQUIRED
 *
 * "only required if the original request had no proposedToEmployeeId". So an
 * open request — anyone can take this — needs the approver to name who is
 * taking it, and a directed one already knows. When it is not needed this omits
 * the body entirely rather than sending an empty object, matching the incident
 * resolve endpoint.
 */
