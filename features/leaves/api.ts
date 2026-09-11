import { api, asList } from "@/lib/api-client";

import type { CreateLeavePayload, LeaveFilters, LeaveRequest } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Mine
// ─────────────────────────────────────────────────────────────────────────────

export const getMyLeaves = async () =>
  asList<LeaveRequest>(await api.get("/leaves/me"), "GET /leaves/me");

export const submitLeave = (payload: CreateLeavePayload) =>
  api.post<LeaveRequest>("/leaves", payload);

/** Own request only, and only while still PENDING. */
export const cancelLeave = (id: string) => api.delete<void>(`/leaves/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The queue [Manager/HR/Admin]
// ─────────────────────────────────────────────────────────────────────────────

export const listLeaves = async (filters: LeaveFilters = {}) =>
  asList<LeaveRequest>(
    await api.get("/leaves", { query: { ...filters } }),
    "GET /leaves",
  );

export const getLeave = (id: string) => api.get<LeaveRequest>(`/leaves/${id}`);

/** PUT, not POST — matching the endpoint. */
export const approveLeave = (id: string) => api.put<LeaveRequest>(`/leaves/${id}/approve`);

export const rejectLeave = (id: string) => api.put<LeaveRequest>(`/leaves/${id}/reject`);

/*
 * ONE RESOURCE, TWO AUDIENCES.
 *
 * /leaves/me is every employee's own history. /leaves is the approval queue and
 * needs Manager or above. Same rows underneath, different questions being asked,
 * which is why they are separate endpoints rather than one with a filter.
 *
 * Approve and reject are PUT. Most of this API's state changes are POST — expense
 * approve, incident acknowledge, vendor activate are all POST — so this is the
 * odd one out and easy to get wrong from memory.
 *
 * `cancelLeave` is a DELETE that only the submitter may call, and only while the
 * request is pending. A manager rejects; an employee cancels. They are different
 * verbs on purpose.
 *
 * WHY THE TWO READS GO THROUGH `asList`
 *
 * `/leaves/me` returned something that was not an array, and the component's
 * `[...(data ?? [])]` crashed the whole page with "is not iterable" rather than
 * degrading to an empty list.
 *
 * `asList` unwraps the common list wrappers, returns `[]` for anything it does
 * not recognise, and warns in development with the actual payload — so the shape
 * gets fixed rather than silently absorbed. The type parameter stays honest:
 * callers still receive `LeaveRequest[]`.
 */
