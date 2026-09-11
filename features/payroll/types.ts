export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  /** YYYY-MM-DD — a full date, not a month. */
  payPeriod: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  processedAt: string;
}

export interface RunPayrollPayload {
  /**
   * YYYY-MM-DD. The docs example is "2026-09-30" — the END of the period, not
   * the month. Sending "2026-09" as the old docs implied will fail to parse.
   */
  payPeriod: string;
}
