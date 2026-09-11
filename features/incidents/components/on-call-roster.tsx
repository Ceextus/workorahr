"use client";

import { AlertCircle, PhoneCall, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  useCreateOnCall,
  useCurrentOnCall,
  useDeleteOnCall,
  useOnCallRoster,
} from "@/features/incidents/hooks";
import { UserPicker } from "@/features/employees/components/user-picker";
import { useUserNameMap } from "@/features/employees/hooks";
import { isOnCallNow, type OnCallAssignment } from "@/features/incidents/types";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Who is on call right now
// ─────────────────────────────────────────────────────────────────────────────

export function CurrentOnCall() {
  const { data, isLoading, error } = useCurrentOnCall();
  const { resolveUser } = useUserNameMap();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
        <Skeleton className="h-12 w-12 shrink-0" rounded="field" />
        <div className="flex flex-1 flex-col gap-2">
          <SkeletonText width="30%" className="h-3" />
          <SkeletonText width="50%" className="h-4" />
        </div>
      </div>
    );
  }

  // A failed request and genuine no-coverage are different things and must not
  // look the same — one is a bug, the other is an operational emergency.
  const covered = !error && data != null;

  return (
    <div
      className={`flex items-center gap-4 rounded-card p-5 shadow-card sm:p-6 ${
        covered ? "bg-surface-raised" : "bg-error/8 ring-1 ring-error/25"
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-field ${
          covered ? "bg-primary/10 text-primary" : "bg-error/12 text-error"
        }`}
      >
        <PhoneCall size={22} aria-hidden />
      </span>

      <div className="min-w-0">
        <p className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          On call right now
        </p>
        {error ? (
          <p className="text-body-lg font-bold text-error">Could not check</p>
        ) : covered ? (
          <>
            <p className="break-all text-body-lg font-bold text-text-strong">
              {resolveUser(data.userName, data.userId)}
            </p>
            <p className="text-body-sm text-text-subtle">
              Until {formatDateTime(data.endsAt) ?? "—"}
            </p>
          </>
        ) : (
          <>
            <p className="text-body-lg font-bold text-error">Nobody</p>
            <p className="text-body-sm text-text-muted">
              There is no active on-call assignment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Add to the rota
// ─────────────────────────────────────────────────────────────────────────────

function NewAssignmentDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const userIdField = useId();
  const startsField = useId();
  const endsField = useId();

  const [userId, setUserId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useCreateOnCall();

  const errors = {
    userId: userId.trim() ? undefined : "Choose who is on call.",
    startsAt: startsAt ? undefined : "Pick a start.",
    endsAt: !endsAt
      ? "Pick an end."
      : startsAt && new Date(endsAt) <= new Date(startsAt)
        ? "The end must come after the start."
        : undefined,
  };
  const isValid = !errors.userId && !errors.startsAt && !errors.endsAt;

  function close() {
    setUserId("");
    setStartsAt("");
    setEndsAt("");
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      userId: userId.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[on-call] sent:", payload);
      console.error("[on-call] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  const field =
    "h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add to the on-call rota"
      description="Whoever is assigned is the first person paged when something breaks."
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
            form="on-call-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Saving…" : "Add assignment"}
          </button>
        </>
      }
    >
      <form id="on-call-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={userIdField} className="text-body-md font-semibold text-text-strong">
            Who is on call <span className="text-error">*</span>
          </label>
          <UserPicker
            id={userIdField}
            value={userId}
            onChange={setUserId}
            placeholder="Choose who is on call"
            invalid={Boolean(touched && errors.userId)}
          />
          {touched && errors.userId ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.userId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={startsField} className="text-body-md font-semibold text-text-strong">
            Starts <span className="text-error">*</span>
          </label>
          <input
            id={startsField}
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={`${field} ${
              touched && errors.startsAt ? "border-error" : "border-border-subtle"
            }`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={endsField} className="text-body-md font-semibold text-text-strong">
            Ends <span className="text-error">*</span>
          </label>
          <input
            id={endsField}
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={`${field} ${
              touched && errors.endsAt ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.endsAt ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.endsAt}
            </p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The rota
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  assignment,
  canManage,
  onDelete,
  isDeleting,
  resolveUser,
}: {
  assignment: OnCallAssignment;
  canManage: boolean;
  resolveUser: (name: string | null | undefined, id: string | null | undefined) => string | null;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const live = isOnCallNow(assignment);

  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-field ${
          live ? "bg-primary/12 text-primary" : "bg-surface-sunk text-text-subtle"
        }`}
      >
        <PhoneCall size={17} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-all text-body-md font-semibold text-text-strong">
            {resolveUser(assignment.userName, assignment.userId)}
          </p>
          {live ? (
            <span className="rounded-pill bg-primary/12 px-2.5 py-0.5 text-body-sm font-bold text-primary">
              On call
            </span>
          ) : null}
        </div>
        <p className="text-body-sm text-text-muted">
          {formatDateTime(assignment.startsAt) ?? "—"} →{" "}
          {formatDateTime(assignment.endsAt) ?? "—"}
        </p>
      </div>

      {canManage ? (
        <button
          type="button"
          onClick={() => onDelete(assignment.id)}
          disabled={isDeleting}
          aria-label="Remove this assignment"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
        >
          <Trash2 size={17} aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

export function OnCallRoster({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error } = useOnCallRoster();
  const remove = useDeleteOnCall();
  const { resolveUser } = useUserNameMap();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load the on-call rota.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto sm:w-fit"
        >
          <Plus size={16} aria-hidden />
          Add assignment
        </button>
      ) : null}

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2].map((row) => (
              <li key={row} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <Skeleton className="h-10 w-10 shrink-0" rounded="field" />
                <div className="flex flex-1 flex-col gap-2">
                  <SkeletonText width="40%" />
                  <SkeletonText width="60%" className="h-3" />
                </div>
              </li>
            ))}
          </ul>
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <PhoneCall size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                Nothing scheduled
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {canManage
                  ? "Add an assignment so somebody is responsible when things break."
                  : "No upcoming on-call assignments."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.map((assignment) => (
              <Row
                key={assignment.id}
                assignment={assignment}
                canManage={canManage}
                onDelete={(id) => remove.mutate(id)}
                resolveUser={resolveUser}
                isDeleting={remove.isPending && remove.variables === assignment.id}
              />
            ))}
          </ul>
        )}
      </div>

      <NewAssignmentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

/*
 * THE "NOBODY IS ON CALL" STATE IS STYLED AS AN ERROR, AND THAT IS THE POINT.
 *
 * `GET /incidents/on-call/current` returning null is a perfectly successful
 * request. Rendered neutrally — "On call: —" — it reads as missing data and
 * gets ignored.
 *
 * It is not missing data. It means that if something breaks right now, nobody
 * has been designated to answer, which is exactly the condition an ops page
 * exists to surface. So it gets the red treatment, while a genuine request
 * failure says "Could not check" instead. Three states, three appearances.
 *
 * `isOnCallNow` LIVES IN types.ts RATHER THAN HERE
 *
 * It reads `Date.now()`, and the React Compiler rejects impure calls inside a
 * component body — the same rule that moved `hasExpired` out of
 * announcement-board.tsx. Module scope is the escape hatch.
 *
 * The consequence is the same too: "On call" is evaluated at render and does
 * not tick. A rota boundary passing while the page sits open will not repaint
 * on its own. `useCurrentOnCall` has a 60s staleTime so a refocus corrects it,
 * which is the right trade for a page nobody watches like a clock.
 */
