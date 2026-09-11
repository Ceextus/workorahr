"use client";

import { Check, CircleCheck, Plus, ShieldAlert, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  SeverityBadge,
  StatusBadge,
} from "@/features/incidents/components/incident-bits";
import { AssignIncidentDrawer } from "@/features/incidents/components/assign-incident-drawer";
import { ReportIncidentDrawer } from "@/features/incidents/components/report-incident-drawer";
import { ResolveIncidentDrawer } from "@/features/incidents/components/resolve-incident-drawer";
import { useUserNameMap } from "@/features/employees/hooks";
import {
  useAcknowledgeIncident,
  useCloseIncident,
  useIncidents,
} from "@/features/incidents/hooks";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  type Incident,
  type IncidentFilters,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/features/incidents/types";
import { formatDateTime } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function CardSkeleton({ width }: { width: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16" rounded="pill" />
        <Skeleton className="h-6 w-20" rounded="pill" />
      </div>
      <SkeletonText width={width} className="h-4" />
      <SkeletonText width="95%" className="h-3" />
      <SkeletonText width="35%" className="h-3" />
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · One incident
// ─────────────────────────────────────────────────────────────────────────────

function Card({
  incident,
  canManage,
  onAcknowledge,
  onAssign,
  onResolve,
  onClose,
  busy,
  resolveUser,
}: {
  incident: Incident;
  canManage: boolean;
  resolveUser: (name: string | null | undefined, id: string | null | undefined) => string | null;
  onAcknowledge: (id: string) => void;
  onAssign: (incident: Incident) => void;
  onResolve: (incident: Incident) => void;
  onClose: (id: string) => void;
  busy: boolean;
}) {
  // Which actions the current status actually permits. Showing "Acknowledge"
  // on a closed incident would be a button that can only ever fail.
  const canAcknowledge = incident.status === "OPEN";
  const canResolve =
    incident.status === "OPEN" || incident.status === "ACKNOWLEDGED";
  const canClose = incident.status === "RESOLVED";

  const assignee = resolveUser(incident.assigneeName, incident.assigneeUserId);

  return (
    <article className="flex flex-col gap-3 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
        {incident.createdAt ? (
          <time
            dateTime={incident.createdAt}
            className="ml-auto text-body-sm text-text-subtle"
          >
            {formatDateTime(incident.createdAt)}
          </time>
        ) : null}
      </div>

      <div>
        <h3 className="break-words text-body-lg font-bold text-text-strong">
          {incident.title}
        </h3>
        <p className="mt-1 whitespace-pre-line break-words text-body-md text-text-muted">
          {incident.description}
        </p>
      </div>

      {incident.resolutionNotes ? (
        <p className="rounded-field bg-surface-sunk p-3 text-body-sm text-text-muted">
          <span className="font-semibold text-text-strong">Resolution: </span>
          {incident.resolutionNotes}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-text-subtle">
        <span className="flex items-center gap-1.5">
          <UserPlus size={14} aria-hidden />
          {assignee ? (
            <span className="break-all">{assignee}</span>
          ) : (
            "Unassigned"
          )}
        </span>
        {incident.reportedByName ? (
          <>
            <span aria-hidden>·</span>
            <span>Reported by {incident.reportedByName}</span>
          </>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3">
          {/*
            Always available, unlike the lifecycle buttons: assignment is
            orthogonal to status, so even a CLOSED incident can be handed to
            someone for follow-up.
          */}
          <button
            type="button"
            onClick={() => onAssign(incident)}
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk disabled:opacity-40"
          >
            <UserPlus size={16} aria-hidden />
            {assignee ? "Reassign" : "Assign"}
          </button>

          {canAcknowledge ? (
            <button
              type="button"
              onClick={() => onAcknowledge(incident.id)}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk disabled:opacity-40"
            >
              <Check size={16} aria-hidden />
              Acknowledge
            </button>
          ) : null}

          {canResolve ? (
            <button
              type="button"
              onClick={() => onResolve(incident)}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-field bg-primary px-4 text-body-md font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <CircleCheck size={16} aria-hidden />
              Resolve
            </button>
          ) : null}

          {canClose ? (
            <button
              type="button"
              onClick={() => onClose(incident.id)}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk disabled:opacity-40"
            >
              <X size={16} aria-hidden />
              Close
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/*
 * THE ACTION BUTTONS ARE DERIVED FROM `status`, NOT ALWAYS SHOWN.
 *
 * The lifecycle is OPEN → ACKNOWLEDGED → RESOLVED → CLOSED, and the backend
 * enforces it. Rendering all four buttons all the time would mean three of them
 * return an error on any given row, and the user learns which ones work by
 * being told off.
 *
 * Resolve is deliberately available from OPEN as well as ACKNOWLEDGED. Small
 * incidents get fixed before anyone formally acknowledges them, and forcing a
 * pointless intermediate click is how process gets abandoned.
 *
 * `resolveUser` TRIES THREE SOURCES BEFORE GIVING UP
 *
 * The name on the response if there is one, then the directory keyed by user
 * id, then the raw id. This used to stop at the first two steps and render a
 * 36-character UUID at whoever was reading — which is no use to a person
 * deciding who to chase about an outage.
 *
 * The middle step became possible once EmployeeResponse.userId reached the
 * frontend type. `useEmployeeNameMap()` still cannot do this: it is keyed by
 * EMPLOYEE id and would silently miss every row. `useUserNameMap()` is the same
 * shared request, keyed the other way.
 *
 * `break-all` stays for the last-resort case, so a raw id cannot widen the card.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The board
// ─────────────────────────────────────────────────────────────────────────────

export function IncidentBoard({ canManage }: { canManage: boolean }) {
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");
  const [reportOpen, setReportOpen] = useState(false);
  const [resolving, setResolving] = useState<Incident | null>(null);
  const [assigning, setAssigning] = useState<Incident | null>(null);

  // Empty string means "no filter", so it must not reach the query string.
  const filters: IncidentFilters = useMemo(
    () => ({
      ...(status && { status }),
      ...(severity && { severity }),
    }),
    [status, severity],
  );

  const { data, isLoading, error } = useIncidents(filters);
  const acknowledge = useAcknowledgeIncident();
  const { resolveUser } = useUserNameMap();
  const close = useCloseIncident();

  const busy = acknowledge.isPending || close.isPending;

  const incidents = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        // Open first, then by severity, then newest. The board should read as
        // a priority queue rather than an audit log.
        const openness = Number(b.status === "OPEN") - Number(a.status === "OPEN");
        if (openness !== 0) return openness;

        const bySeverity =
          INCIDENT_SEVERITIES.indexOf(b.severity) -
          INCIDENT_SEVERITIES.indexOf(a.severity);
        if (bySeverity !== 0) return bySeverity;

        return (
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
      }),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load incidents.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as IncidentStatus | "")}
          aria-label="Filter by status"
          className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
        >
          <option value="">Any status</option>
          {INCIDENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select
          value={severity}
          onChange={(event) =>
            setSeverity(event.target.value as IncidentSeverity | "")
          }
          aria-label="Filter by severity"
          className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
        >
          <option value="">Any severity</option>
          {INCIDENT_SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto"
        >
          <Plus size={16} aria-hidden />
          Report incident
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {["60%", "45%", "72%"].map((width, row) => (
            <CardSkeleton key={row} width={width} />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <ShieldAlert size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">
              {status || severity ? "Nothing matches those filters" : "All clear"}
            </p>
            <p className="mt-1 max-w-sm text-body-md text-text-muted">
              {status || severity
                ? "Try widening the filters."
                : "No incidents have been reported. Long may it last."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {incidents.map((incident) => (
            <Card
              key={incident.id}
              incident={incident}
              canManage={canManage}
              onAcknowledge={(id) => acknowledge.mutate(id)}
              onAssign={setAssigning}
              resolveUser={resolveUser}
              onResolve={setResolving}
              onClose={(id) => close.mutate(id)}
              busy={busy}
            />
          ))}
        </div>
      )}

      <ReportIncidentDrawer open={reportOpen} onClose={() => setReportOpen(false)} />
      {/*
        `key` is load-bearing: it remounts the drawer when a different incident
        is selected, which is what clears the notes box. See the note at the
        foot of resolve-incident-drawer.tsx.
      */}
      <AssignIncidentDrawer
        key={`assign-${assigning?.id ?? "none"}`}
        incident={assigning}
        onClose={() => setAssigning(null)}
      />

      <ResolveIncidentDrawer
        key={resolving?.id ?? "none"}
        incident={resolving}
        onClose={() => setResolving(null)}
      />
    </div>
  );
}

/*
 * FILTERING IS SERVER-SIDE HERE AND CLIENT-SIDE ON /notifications. THE
 * DIFFERENCE IS THE API.
 *
 * GET /incidents documents `status` and `severity` query parameters, so the
 * filter belongs in the query key and the server does the work. GET
 * /notifications has no such parameter, so that page filters in memory.
 *
 * Same UI, opposite implementation, decided by what the endpoint offers rather
 * than by preference.
 *
 * WHY THE EMPTY STRING IS STRIPPED
 *
 * `?status=` with no value is not the same request as omitting `status`. Spring
 * binds it as an empty string, which matches no enum constant, and the endpoint
 * either 400s or returns nothing. The conditional spread means "Any status"
 * genuinely sends no parameter.
 *
 * SORTING BY `INCIDENT_SEVERITIES.indexOf`
 *
 * The array is declared LOW → CRITICAL, so a higher index is more severe and
 * `b - a` sorts worst-first. This is the one place in the app that leans on the
 * *order* of a const array rather than just its membership — worth knowing,
 * because reordering that declaration silently reverses this sort.
 * lib/permissions.ts avoids the same coupling with an explicit RANK map, and
 * this could too if it ever grows a second use.
 */
