import { api, asList } from "@/lib/api-client";

import type { PayrollRecord, RunPayrollPayload } from "./types";

/** [ADMIN] Processes payroll for every active employee. */
export const runPayroll = (payload: RunPayrollPayload) =>
  api.post<PayrollRecord[]>("/payroll/run", payload);

/** [HR/ADMIN] */
export const listPayroll = async () =>
  asList<PayrollRecord>(await api.get("/payroll"), "GET /payroll");

/** [HR/ADMIN] */
export const getPayroll = (id: string) =>
  api.get<PayrollRecord>(`/payroll/${id}`);

export const getMyPayslips = async () =>
  asList<PayrollRecord>(await api.get("/payroll/me"), "GET /payroll/me");

/** [HR/ADMIN] */
export const getPayrollForEmployee = async (employeeId: string) =>
  asList<PayrollRecord>(
    await api.get(`/payroll/employee/${employeeId}`),
    "GET /payroll/employee/{id}",
  );
