/**
 * GET /ops-pulse — a read-only snapshot, open to all authenticated employees.
 *
 * Field names taken from the backend's OpsPulseDto record, not from the docs:
 * the collection describes this endpoint only in prose ("open incidents, SLA
 * breaches, on-call coverage, pending leave, etc.") and never lists the keys.
 */
export interface OpsPulse {
  activeEmployeeCount: number;
  currentlyOnDutyCount: number;
  openIncidentCount: number;
  slaBreachedIncidentCount: number;
  currentlyOnCallCount: number;
  assetsInMaintenanceCount: number;
  activeAnnouncementCount: number;
  pendingLeaveRequestCount: number;
}

/*
 * EVERY ONE OF THESE NAMES WAS PREVIOUSLY WRONG, AND THE DASHBOARD SHOWED
 * NOTHING BECAUSE OF IT.
 *
 * This interface was written from the endpoint's one-line description, which
 * named the *concepts* but not the fields. So it read `openIncidents` where the
 * API sends `openIncidentCount`, `pendingLeaves` for `pendingLeaveRequestCount`,
 * `todayCheckIns` for `currentlyOnDutyCount`, and invented `pendingExpenses`
 * and `criticalIncidents`, which do not exist at all.
 *
 * TypeScript could not catch any of it: the response is parsed at runtime and
 * cast to this shape, so a missing key is `undefined`, and `undefined` in a tile
 * renders as a dash rather than an error. Six tiles quietly showed nothing while
 * the request succeeded.
 *
 * The lesson worth keeping: a hand-written interface is an assertion about a
 * server, not a fact. Where the docs give prose instead of a schema, the shape
 * has to be confirmed against a real response or the DTO before it is trusted.
 */
