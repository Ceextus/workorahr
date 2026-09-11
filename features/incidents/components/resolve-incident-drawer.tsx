"use client";

import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { SeverityBadge } from "@/features/incidents/components/incident-bits";
import { useResolveIncident } from "@/features/incidents/hooks";
import type { Incident } from "@/features/incidents/types";
import { ApiError } from "@/lib/api-client";

export function ResolveIncidentDrawer({
  incident,
  onClose,
}: {
  /** The incident being resolved, or null when the drawer is shut. */
  incident: Incident | null;
  onClose: () => void;
}) {
  const notesId = useId();
  const [notes, setNotes] = useState("");
  const resolve = useResolveIncident();

  function close() {
    setNotes("");
    resolve.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!incident) return;

    const payload = { id: incident.id, resolutionNotes: notes.trim() || undefined };

    try {
      await resolve.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[resolve incident] sent:", payload);
      console.error("[resolve incident] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={incident !== null}
      onClose={close}
      title="Resolve incident"
      description="Say what fixed it. The next person to hit this will thank you."
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
            form="resolve-incident-form"
            disabled={resolve.isPending}
            className="h-12 flex-1 rounded-field bg-primary text-body-md font-semibold text-white transition-colors hover:bg-primary/90 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {resolve.isPending ? "Resolving…" : "Mark resolved"}
          </button>
        </>
      }
    >
      <form
        id="resolve-incident-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        {incident ? (
          <div className="flex flex-col gap-2 rounded-field bg-surface-sunk p-4">
            <SeverityBadge severity={incident.severity} />
            <p className="break-words text-body-md font-bold text-text-strong">
              {incident.title}
            </p>
            <p className="break-words text-body-sm text-text-muted">
              {incident.description}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor={notesId} className="text-body-md font-semibold text-text-strong">
            Resolution notes{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder="Rolled back the offending deploy."
            className="w-full resize-y rounded-field border border-border-subtle bg-surface-raised px-4 py-3 text-body-md text-text-strong outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-body-sm text-text-subtle">
            Leave it empty and the incident is still resolved — the note is the
            only part that is optional.
          </p>
        </div>
      </form>
    </Drawer>
  );
}

/*
 * `open` IS DERIVED FROM `incident !== null` RATHER THAN A SEPARATE BOOLEAN.
 *
 * The parent holds one piece of state — which incident is being resolved — and
 * this drawer reads both its visibility and its content from it. The
 * alternative, an `open` boolean beside a `selected` object, is two states that
 * can contradict: open with nothing selected renders an empty drawer, and
 * closing without clearing the selection leaks the previous incident's title
 * into the next one that opens.
 *
 * THE NOTES BOX IS RESET BY A `key`, NOT BY AN EFFECT
 *
 * Opening a second incident must not show notes typed for the first. The
 * obvious fix is `useEffect(() => setNotes(""), [incident?.id])`, and the
 * React Compiler lint rejects it: setState inside an effect body is a
 * cascading render — React commits one render, then immediately renders again
 * to apply the reset.
 *
 * The parent instead passes `key={resolving?.id}`, so selecting a different
 * incident unmounts this component and mounts a fresh one with `notes` already
 * empty. No effect, no second render, and nothing to keep in sync. `Drawer`
 * returns null while closed, so the remount is invisible.
 *
 * This is the general answer to "reset state when a prop changes" — the state
 * belongs to that prop, so let its identity own the lifetime.
 *
 * `notes.trim() || undefined` — an empty box must send no `resolutionNotes`
 * field at all, not an empty string. The docs say the body is optional; a body
 * containing `""` is not the same thing as no body.
 */
