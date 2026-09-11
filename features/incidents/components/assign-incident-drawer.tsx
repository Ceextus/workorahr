"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { UserPicker } from "@/features/employees/components/user-picker";
import { SeverityBadge } from "@/features/incidents/components/incident-bits";
import { useAssignIncident } from "@/features/incidents/hooks";
import type { Incident } from "@/features/incidents/types";
import { ApiError } from "@/lib/api-client";

export function AssignIncidentDrawer({
  incident,
  onClose,
}: {
  /** The incident being assigned, or null when the drawer is shut. */
  incident: Incident | null;
  onClose: () => void;
}) {
  const pickerId = useId();
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [touched, setTouched] = useState(false);

  const assign = useAssignIncident();
  const error = assigneeUserId ? undefined : "Choose who owns this.";

  function close() {
    setAssigneeUserId("");
    setTouched(false);
    assign.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!incident || error) return;

    const payload = { id: incident.id, assigneeUserId };

    try {
      await assign.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[assign incident] sent:", payload);
      console.error("[assign incident] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={incident !== null}
      onClose={close}
      title="Assign incident"
      description="Give this one an owner. It does not change the status."
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="assign-incident-form"
            disabled={assign.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {assign.isPending ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      <form
        id="assign-incident-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        {incident ? (
          <div className="flex flex-col gap-2 rounded-field bg-surface-sunk p-4">
            <SeverityBadge severity={incident.severity} />
            <p className="break-words text-body-md font-bold text-text-strong">
              {incident.title}
            </p>
            {incident.assigneeName ?? incident.assigneeUserId ? (
              <p className="break-all text-body-sm text-text-muted">
                Currently with {incident.assigneeName ?? incident.assigneeUserId}
              </p>
            ) : (
              <p className="text-body-sm text-text-muted">Currently unassigned.</p>
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor={pickerId} className="text-body-md font-semibold text-text-strong">
            Owner <span className="text-error">*</span>
          </label>
          <UserPicker
            id={pickerId}
            value={assigneeUserId}
            onChange={setAssigneeUserId}
            placeholder="Choose an owner"
            invalid={Boolean(touched && error)}
          />
          {touched && error ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}

/*
 * THIS ENDPOINT HAD A HOOK AND NO WAY TO REACH IT.
 *
 * `useAssignIncident` was written alongside acknowledge, resolve and close, and
 * then never rendered — POST /incidents/{id}/assign existed in the client and
 * could not be called from anywhere in the running app. It was invisible
 * because nothing errors: unused code compiles, lints and ships.
 *
 * The reason it was skipped is the same reason the on-call form asked for a
 * pasted UUID — assignment needs a *user* id, and at the time this app had no
 * way to produce one. `UserPicker` fixes both in one place.
 *
 * ASSIGNING DOES NOT MOVE THE STATUS, AND THE COPY SAYS SO
 *
 * OPEN → ACKNOWLEDGED → RESOLVED → CLOSED is the lifecycle; assignment is
 * orthogonal and can happen at any point in it, including on a CLOSED incident
 * being reassigned for follow-up. Someone expecting "assign" to also mean
 * "acknowledge" would otherwise wonder why the badge did not change.
 *
 * `incident.assigneeName ?? incident.assigneeUserId` again, and `break-all`
 * again: the response may carry a name or only a raw id, and a 36-character
 * UUID would otherwise widen the drawer.
 */
