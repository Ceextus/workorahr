import { api, asList } from "@/lib/api-client";

import type { Department, DepartmentPayload } from "./types";

export const listDepartments = async () =>
  asList<Department>(await api.get("/departments"), "GET /departments");

export const getDepartment = (id: string) => api.get<Department>(`/departments/${id}`);

/** [HR+] */
export const createDepartment = (payload: DepartmentPayload) =>
  api.post<Department>("/departments", payload);

/** [HR+] */
export const updateDepartment = (id: string, payload: DepartmentPayload) =>
  api.put<Department>(`/departments/${id}`, payload);

/** [HR+] Responds 204 with no body. */
export const deleteDepartment = (id: string) => api.delete<void>(`/departments/${id}`);
