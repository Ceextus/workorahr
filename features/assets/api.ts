import { api, asList } from "@/lib/api-client";

import type {
  AssignAssetPayload,
  Asset,
  CreateAssetPayload,
  ReturnAssetPayload,
} from "./types";

/** [HR/Admin] Everything the company owns. */
export const listAssets = async () =>
  asList<Asset>(await api.get("/assets"), "GET /assets");

/** Whatever the caller is currently holding. Open to everyone. */
export const getMyAssets = async () =>
  asList<Asset>(await api.get("/assets/mine"), "GET /assets/mine");

export const createAsset = (payload: CreateAssetPayload) =>
  api.post<Asset>("/assets", payload);

export const assignAsset = ({ id, employeeId }: AssignAssetPayload) =>
  api.post<void>(`/assets/${id}/assign`, { employeeId });

export const returnAsset = ({ id, conditionNotes }: ReturnAssetPayload) =>
  api.post<void>(
    `/assets/${id}/return`,
    // "Body is optional — omit it entirely for a plain return."
    conditionNotes?.trim() ? { conditionNotes: conditionNotes.trim() } : undefined,
  );

/*
 * TWO READS, AND THE SPLIT IS A PERMISSION BOUNDARY.
 *
 * GET /assets is annotated (HR/Admin) in the docs. GET /assets/mine is not, and
 * has to be open — an employee asking "what am I holding?" is the whole point
 * of the second endpoint existing.
 *
 * So the page renders /assets/mine for everybody and appends the full register
 * only for HR. Same shape as attendance, payroll and expenses: the personal
 * half always shows, the organisational half is gated.
 *
 * There is no update or delete endpoint for an asset. Once created it can only
 * be assigned and returned — a typo in a serial number is permanent as far as
 * this API is concerned. Worth confirming with the backend before anyone
 * catalogues a hundred laptops.
 */
