/** GET /ops-pulse — a read-only snapshot, open to all authenticated employees. */
export interface OpsPulse {
  openIncidents: number;
  criticalIncidents: number;
  onCallCount: number;
  pendingLeaves: number;
  todayCheckIns: number;
  pendingExpenses: number;
}
