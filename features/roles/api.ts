import { api, asList } from "@/lib/api-client";

import type { RolePayload, RoleRecord } from "./types";

export const listRoles = async () =>
  asList<RoleRecord>(await api.get("/roles"), "GET /roles");
export const getRole = (id: string) => api.get<RoleRecord>(`/roles/${id}`);
export const createRole = (payload: RolePayload) => api.post<RoleRecord>("/roles", payload);
export const updateRole = (id: string, payload: RolePayload) =>
  api.put<RoleRecord>(`/roles/${id}`, payload);
export const deleteRole = (id: string) => api.delete<void>(`/roles/${id}`);
