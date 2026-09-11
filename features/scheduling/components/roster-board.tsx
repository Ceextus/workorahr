"use client";

import { AlertCircle, CalendarClock, Clock, Plus, Trash2, UserPlus } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useEmployees } from "@/features/employees/hooks";
import {
  useAssignShift,
  useCreateShift,
  useOnDuty,
  useRemoveAssignment,
  useRoster,
  useShifts,
} from "@/features/scheduling/hooks";
import { shortTime, type RosterAssignment } from "@/features/scheduling/types";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Dates
// ─────────────────────────────────────────────────────────────────────────────

/** "2026-09-08" for a date input, in the viewer's timezone. */
function isoDay(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function todayValue(): string {
  return isoDay(new Date());
}

function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + count);
  return isoDay(date);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Create a shift template
// ─────────────────────────────────────────────────────────────────────────────

function NewShiftDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nameId = useId();
  const startId = useId();
  const endId = useId();
  const descriptionId = useId();

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useCreateShift();
  const nameError = name.trim() ? undefined : "Name the shift.";

  function close() {
    setName("");
    setStartTime("08:00");
    setEndTime("16:00");
    setDescription("");
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (nameError) return;

    const payload = {
      name: name.trim(),
      // The API wants HH:mm:ss; the input gives HH:mm.
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      ...(description.trim() && { description: description.trim() }),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[create shift] sent:", payload);
      console.error("[create shift] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New shift"
      description="A reusable template — Morning, Night, Weekend cover."
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
            form="new-shift-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Creating…" : "Create shift"}
          </button>
        </>
      }
    >
      <form id="new-shift-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-body-md font-semibold text-text-strong">
            Name <span className="text-error">*</span>
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Morning"
            className={`h-12 ${fieldBase} ${
              touched && nameError ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && nameError ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={startId} className="text-body-md font-semibold text-text-strong">
              Starts <span className="text-error">*</span>
            </label>
            <input
              id={startId}
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={`h-12 ${fieldBase} border-border-subtle`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={endId} className="text-body-md font-semibold text-text-strong">
              Ends <span className="text-error">*</span>
            </label>
            <input
              id={endId}
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className={`h-12 ${fieldBase} border-border-subtle`}
            />
          </div>
        </div>

        <p className="rounded-field bg-surface-sunk p-3 text-body-sm text-text-muted">
          An end earlier than the start is allowed — that is how an overnight
          shift is expressed, such as 22:00 to 06:00.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor={descriptionId} className="text-body-md font-semibold text-text-strong">
            Description <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Standard morning shift"
            className={`resize-y py-3 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

/*
 * NO VALIDATION THAT `endTime` IS AFTER `startTime`, AND THAT IS DELIBERATE.
 *
 * Every other form in this app rejects an end before its start — the on-call
 * drawer and the booking drawer both do. Those are *instants*, so an end before
 * a start is genuinely impossible.
 *
 * A shift is a wall-clock pattern, not an instant. "22:00 to 06:00" is a normal
 * night shift, and rejecting it would make this form unable to express the most
 * common non-office schedule there is. The note says so, because a form that
 * accepts something surprising should explain itself.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Put someone on a shift
// ─────────────────────────────────────────────────────────────────────────────

function AssignDrawer({
  open,
  day,
  onClose,
}: {
  open: boolean;
  day: string;
  onClose: () => void;
}) {
  const shiftField = useId();
  const employeeField = useId();
  const dateField = useId();

  const [shiftId, setShiftId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(day);

  const { data: shifts } = useShifts();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const assign = useAssignShift();

  const active = useMemo(
    () => (employees ?? []).filter((employee) => employee.active !== false),
    [employees],
  );

  const isValid = Boolean(shiftId && employeeId && date);

  function close() {
    setShiftId("");
    setEmployeeId("");
    assign.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) return;

    const payload = { shiftId, employeeId, date };

    try {
      await assign.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[assign shift] sent:", payload);
      console.error("[assign shift] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Assign a shift"
      description="Put somebody on the rota for a particular day."
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
            form="assign-shift-form"
            disabled={assign.isPending || !isValid}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {assign.isPending ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      <form id="assign-shift-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={shiftField} className="text-body-md font-semibold text-text-strong">
            Shift <span className="text-error">*</span>
          </label>
          <select
            id={shiftField}
            value={shiftId}
            onChange={(event) => setShiftId(event.target.value)}
            className={`h-12 ${fieldBase} border-border-subtle`}
          >
            <option value="">Choose a shift</option>
            {(shifts ?? []).map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} · {shortTime(shift.startTime)}–{shortTime(shift.endTime)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={employeeField} className="text-body-md font-semibold text-text-strong">
            Who <span className="text-error">*</span>
          </label>
          <select
            id={employeeField}
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            disabled={employeesLoading}
            className={`h-12 ${fieldBase} border-border-subtle`}
          >
            <option value="">{employeesLoading ? "Loading people…" : "Choose someone"}</option>
            {active.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={dateField} className="text-body-md font-semibold text-text-strong">
            Date <span className="text-error">*</span>
          </label>
          <input
            id={dateField}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · On duty right now
// ─────────────────────────────────────────────────────────────────────────────

export function OnDutyNow() {
  const { data, isLoading, error } = useOnDuty();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
        <Skeleton className="h-12 w-12 shrink-0" rounded="field" />
        <div className="flex flex-1 flex-col gap-2">
          <SkeletonText width="25%" className="h-3" />
          <SkeletonText width="45%" className="h-4" />
        </div>
      </div>
    );
  }

  const working = error ? [] : (data ?? []);

  return (
    <div className="flex items-start gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
        <Clock size={22} aria-hidden />
      </span>

      <div className="min-w-0">
        <p className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          On duty now
        </p>
        {error ? (
          <p className="text-body-lg font-bold text-text-muted">Could not check</p>
        ) : working.length === 0 ? (
          <p className="text-body-lg font-bold text-text-strong">Nobody scheduled</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {working.map((assignment) => (
              <span
                key={assignment.id}
                className="rounded-pill bg-primary/10 px-2.5 py-1 text-body-sm font-semibold text-primary"
              >
                {assignment.employeeName ?? assignment.employeeId.slice(0, 8)}
                {assignment.shiftName ? ` · ${assignment.shiftName}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · The roster
// ─────────────────────────────────────────────────────────────────────────────

export function RosterBoard({ canManage }: { canManage: boolean }) {
  const fromId = useId();
  const toId = useId();

  const [start, setStart] = useState(todayValue);
  const [end, setEnd] = useState(() => addDays(todayValue(), 13));
  const [shiftOpen, setShiftOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const range = useMemo(() => ({ start, end }), [start, end]);
  const { data, isLoading, error } = useRoster(range);
  const { data: shifts } = useShifts();
  const remove = useRemoveAssignment();

  const shiftById = useMemo(() => {
    const map = new Map<string, string>();
    for (const shift of shifts ?? []) {
      map.set(shift.id, `${shift.name} · ${shortTime(shift.startTime)}–${shortTime(shift.endTime)}`);
    }
    return map;
  }, [shifts]);

  // Group by day, so the rota reads as a calendar rather than a flat table.
  const byDay = useMemo(() => {
    const groups = new Map<string, RosterAssignment[]>();
    for (const assignment of data ?? []) {
      const list = groups.get(assignment.date) ?? [];
      list.push(assignment);
      groups.set(assignment.date, list);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">Could not load the roster.</p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={fromId} className="text-body-sm font-semibold text-text-muted">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value || todayValue())}
              className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={toId} className="text-body-sm font-semibold text-text-muted">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value || todayValue())}
              className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {canManage ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShiftOpen(true)}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk sm:flex-none"
            >
              <Plus size={16} aria-hidden />
              New shift
            </button>
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              disabled={!shifts?.length}
              title={!shifts?.length ? "Create a shift first" : undefined}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle sm:flex-none"
            >
              <UserPlus size={16} aria-hidden />
              Assign
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((group) => (
            <div key={group} className="rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
              <SkeletonText width="30%" className="h-4" />
              <div className="mt-4 flex flex-col gap-3">
                <SkeletonText width="60%" className="h-3" />
                <SkeletonText width="45%" className="h-3" />
              </div>
            </div>
          ))}
        </div>
      ) : byDay.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <CalendarClock size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">
              Nothing rostered
            </p>
            <p className="mt-1 max-w-sm text-body-md text-text-muted">
              {canManage
                ? shifts?.length
                  ? "Assign somebody to a shift and it appears here."
                  : "Create a shift template first, then assign people to it."
                : "No shifts scheduled in this range."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byDay.map(([day, assignments]) => (
            <section key={day} className="rounded-card bg-surface-raised shadow-card">
              <h3 className="border-b border-border-subtle px-5 py-3.5 text-body-md font-bold text-text-strong sm:px-6">
                {formatDate(day) ?? day}
              </h3>

              <ul className="flex flex-col divide-y divide-border-subtle">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center gap-4 px-5 py-3.5 sm:px-6"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                      <Clock size={16} aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body-md font-semibold text-text-strong">
                        {assignment.employeeName ??
                          `Employee ${assignment.employeeId.slice(0, 8)}`}
                      </p>
                      <p className="text-body-sm text-text-muted">
                        {assignment.shiftName ??
                          shiftById.get(assignment.shiftId) ??
                          "Unknown shift"}
                      </p>
                    </div>

                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => remove.mutate(assignment.id)}
                        disabled={remove.isPending && remove.variables === assignment.id}
                        aria-label="Remove this assignment"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
                      >
                        <Trash2 size={17} aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <NewShiftDrawer open={shiftOpen} onClose={() => setShiftOpen(false)} />
      <AssignDrawer
        key={`assign-${start}`}
        open={assignOpen}
        day={start}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}

/*
 * GROUPED BY DAY, WITH THE GROUPING DONE HERE.
 *
 * GET /scheduling/roster returns a flat list of assignments across the whole
 * range. Rendered flat, Monday's night shift sits next to Thursday's morning
 * and the rota is unreadable.
 *
 * The `Map` keeps insertion cheap and the final `.sort()` orders by the date
 * string — which works because ISO dates sort lexicographically. That is only
 * true for the YYYY-MM-DD format; it would break immediately for anything
 * locale-formatted, which is why the raw `assignment.date` is the sort key and
 * `formatDate` is only applied for display.
 *
 * TWO WEEKS IS THE DEFAULT WINDOW
 *
 * `addDays(today, 13)` — today plus thirteen more. Long enough to cover the
 * fortnight most rotas are planned in, short enough that the response stays
 * small on an endpoint with no pagination. Both ends are editable, so a manager
 * planning a month ahead just widens it.
 */
