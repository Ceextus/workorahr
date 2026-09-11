"use client";

import { AlertCircle, CalendarDays, DoorOpen, Plus, Users, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  useBookings,
  useCancelBooking,
  useCreateBooking,
  useCreateResource,
  useResources,
} from "@/features/bookings/hooks";
import {
  hasEnded,
  isCancelled,
  type BookableResource,
  type Booking,
} from "@/features/bookings/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Dates
// ─────────────────────────────────────────────────────────────────────────────

/** "2026-09-08" for an `<input type="date">`, in the viewer's own timezone. */
function todayValue(): string {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  return new Date(now.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** A local calendar day → the UTC instant range the API wants. */
function dayRange(day: string): { start: string; end: string } {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** "09:00" from an ISO instant, in the viewer's timezone. */
function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/*
 * `new Date("2026-09-08T00:00:00")` — NO TRAILING Z, AND THAT IS THE WHOLE
 * TRICK.
 *
 * With a Z it means midnight UTC. Without one, JavaScript parses it as midnight
 * *local*, which is what "the 8th" means to the person looking at the screen.
 * `toISOString()` then converts to the UTC instant the API expects.
 *
 * Skip that and someone in Lagos asking for the 8th gets bookings from 01:00 on
 * the 8th to 01:00 on the 9th — an hour of the morning missing and an hour of
 * the next day leaking in. Nobody notices until a 00:30 booking goes missing.
 *
 * `todayValue()` does the reverse for the date input's default: shift by the
 * timezone offset BEFORE slicing, or someone west of UTC gets yesterday's date
 * for the first few hours of their day.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Add a resource
// ─────────────────────────────────────────────────────────────────────────────

function NewResourceDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nameId = useId();
  const descriptionId = useId();
  const capacityId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useCreateResource();
  const nameError = name.trim() ? undefined : "Name the room or resource.";

  function close() {
    setName("");
    setDescription("");
    setCapacity("");
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (nameError) return;

    const parsed = Number(capacity);
    const payload = {
      name: name.trim(),
      ...(description.trim() && { description: description.trim() }),
      ...(capacity.trim() && Number.isFinite(parsed) && parsed > 0 && { capacity: parsed }),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[create resource] sent:", payload);
      console.error("[create resource] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add a bookable resource"
      description="A room, a desk, a car — anything people need to reserve."
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
            form="new-resource-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Adding…" : "Add resource"}
          </button>
        </>
      }
    >
      <form id="new-resource-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-body-md font-semibold text-text-strong">
            Name <span className="text-error">*</span>
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Conference Room A"
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

        <div className="flex flex-col gap-2">
          <label htmlFor={descriptionId} className="text-body-md font-semibold text-text-strong">
            Description <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Seats 10, has a projector"
            className={`resize-y py-3 ${fieldBase} border-border-subtle`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={capacityId} className="text-body-md font-semibold text-text-strong">
            Capacity <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            id={capacityId}
            type="number"
            inputMode="numeric"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="10"
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Book something
// ─────────────────────────────────────────────────────────────────────────────

function NewBookingDrawer({
  open,
  resources,
  defaultResourceId,
  day,
  onClose,
}: {
  open: boolean;
  resources: BookableResource[];
  defaultResourceId: string;
  day: string;
  onClose: () => void;
}) {
  const resourceId_ = useId();
  const titleId = useId();
  const startId = useId();
  const endId = useId();

  const [resourceId, setResourceId] = useState(defaultResourceId);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(`${day}T09:00`);
  const [endsAt, setEndsAt] = useState(`${day}T10:00`);
  const [touched, setTouched] = useState(false);

  const create = useCreateBooking();

  const errors = {
    resourceId: resourceId ? undefined : "Choose what you are booking.",
    title: title.trim() ? undefined : "Say what it is for.",
    endsAt:
      startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)
        ? "The end must come after the start."
        : undefined,
  };
  const isValid = !errors.resourceId && !errors.title && !errors.endsAt;

  function close() {
    setTitle("");
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      resourceId,
      title: title.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[create booking] sent:", payload);
      console.error("[create booking] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New booking"
      description="Double bookings are rejected by the server, not guessed at here."
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
            form="new-booking-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Booking…" : "Book it"}
          </button>
        </>
      }
    >
      <form id="new-booking-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={resourceId_} className="text-body-md font-semibold text-text-strong">
            What <span className="text-error">*</span>
          </label>
          <select
            id={resourceId_}
            value={resourceId}
            onChange={(event) => setResourceId(event.target.value)}
            className={`h-12 ${fieldBase} ${
              touched && errors.resourceId ? "border-error" : "border-border-subtle"
            }`}
          >
            <option value="">Choose a resource</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
                {resource.capacity ? ` · seats ${resource.capacity}` : ""}
              </option>
            ))}
          </select>
          {touched && errors.resourceId ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.resourceId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={titleId} className="text-body-md font-semibold text-text-strong">
            What for <span className="text-error">*</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sprint Planning"
            className={`h-12 ${fieldBase} ${
              touched && errors.title ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.title ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={startId} className="text-body-md font-semibold text-text-strong">
            From <span className="text-error">*</span>
          </label>
          <input
            id={startId}
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={endId} className="text-body-md font-semibold text-text-strong">
            Until <span className="text-error">*</span>
          </label>
          <input
            id={endId}
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={`h-12 ${fieldBase} ${
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
// BLOCK 4 · The day view
// ─────────────────────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  resourceName,
  onCancel,
  isCancelling,
}: {
  booking: Booking;
  resourceName: string;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const cancelled = isCancelled(booking);
  const past = hasEnded(booking);

  return (
    <li
      className={`flex items-center gap-4 px-5 py-4 sm:px-6 ${
        cancelled || past ? "opacity-60" : ""
      }`}
    >
      <div className="w-24 shrink-0 text-body-sm tabular-nums text-text-muted">
        <p className="font-semibold text-text-strong">{clockTime(booking.startsAt)}</p>
        <p>{clockTime(booking.endsAt)}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`break-words text-body-md font-semibold text-text-strong ${
            cancelled ? "line-through" : ""
          }`}
        >
          {booking.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-text-muted">
          <span>{booking.resourceName ?? resourceName}</span>
          {booking.bookedByName ? (
            <>
              <span aria-hidden>·</span>
              <span>{booking.bookedByName}</span>
            </>
          ) : null}
          {cancelled ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold text-error">Cancelled</span>
            </>
          ) : null}
        </p>
      </div>

      {!cancelled && !past ? (
        <button
          type="button"
          onClick={() => onCancel(booking.id)}
          disabled={isCancelling}
          aria-label={`Cancel ${booking.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
        >
          <X size={18} aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

export function BookingBoard({ canManageResources }: { canManageResources: boolean }) {
  const dayId = useId();
  const [day, setDay] = useState(todayValue);
  const [resourceId, setResourceId] = useState("");
  const [newResourceOpen, setNewResourceOpen] = useState(false);
  const [newBookingOpen, setNewBookingOpen] = useState(false);

  const { data: resources, isLoading: resourcesLoading } = useResources();

  const filters = useMemo(() => {
    const { start, end } = dayRange(day);
    return { start, end, ...(resourceId && { resourceId }) };
  }, [day, resourceId]);

  const { data, isLoading, error } = useBookings(filters);
  const cancel = useCancelBooking();

  const resourceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const resource of resources ?? []) map.set(resource.id, resource.name);
    return map;
  }, [resources]);

  const bookings = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">Could not load bookings.</p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          id={dayId}
          type="date"
          value={day}
          onChange={(event) => setDay(event.target.value || todayValue())}
          aria-label="Day"
          className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-44"
        />

        <select
          value={resourceId}
          onChange={(event) => setResourceId(event.target.value)}
          aria-label="Filter by resource"
          className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
        >
          <option value="">Everything</option>
          {(resources ?? []).map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2 sm:ml-auto">
          {canManageResources ? (
            <button
              type="button"
              onClick={() => setNewResourceOpen(true)}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk sm:flex-none"
            >
              <DoorOpen size={16} aria-hidden />
              Add resource
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setNewBookingOpen(true)}
            disabled={!resources?.length}
            title={!resources?.length ? "Add a bookable resource first" : undefined}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle sm:flex-none"
          >
            <Plus size={16} aria-hidden />
            Book
          </button>
        </div>
      </div>

      {/* The resource strip — what exists to be booked at all. */}
      {!resourcesLoading && resources?.length ? (
        <div className="flex flex-wrap gap-2">
          {resources.map((resource) => (
            <span
              key={resource.id}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised px-3 py-1.5 text-body-sm text-text-muted shadow-card"
            >
              <DoorOpen size={13} aria-hidden />
              {resource.name}
              {resource.capacity ? (
                <span className="flex items-center gap-1 text-text-subtle">
                  <Users size={12} aria-hidden />
                  {resource.capacity}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2].map((row) => (
              <li key={row} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <Skeleton className="h-9 w-20 shrink-0" />
                <div className="flex flex-1 flex-col gap-2">
                  <SkeletonText width="45%" />
                  <SkeletonText width="30%" className="h-3" />
                </div>
              </li>
            ))}
          </ul>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <CalendarDays size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                {resources?.length ? "Nothing booked" : "Nothing to book yet"}
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {resources?.length
                  ? "This day is completely free."
                  : canManageResources
                    ? "Add a room or a desk and people can start reserving it."
                    : "No bookable resources have been set up yet."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                resourceName={resourceNameById.get(booking.resourceId) ?? "Unknown resource"}
                onCancel={(id) => cancel.mutate(id)}
                isCancelling={cancel.isPending && cancel.variables === booking.id}
              />
            ))}
          </ul>
        )}
      </div>

      <NewResourceDrawer open={newResourceOpen} onClose={() => setNewResourceOpen(false)} />
      {/* Keyed on the day so the time fields default to the day being viewed. */}
      <NewBookingDrawer
        key={`${day}-${resourceId}`}
        open={newBookingOpen}
        resources={resources ?? []}
        defaultResourceId={resourceId}
        day={day}
        onClose={() => setNewBookingOpen(false)}
      />
    </div>
  );
}

/*
 * A DAY AT A TIME, NOT A WEEK OR A LIST OF EVERYTHING.
 *
 * GET /bookings takes `start` and `end`, so the window is a free choice. A day
 * is the right one: it is what someone about to book a room actually needs to
 * see, it keeps the response small without pagination the API does not offer,
 * and it makes the empty state meaningful — "this day is free" is useful,
 * "there are no bookings" across all time is not.
 *
 * THE "BOOK" BUTTON IS DISABLED WITH NO RESOURCES, AND SAYS WHY
 *
 * `disabled` plus a `title` explaining it. A booking form with an empty
 * resource dropdown is a dead end someone has to work out for themselves; this
 * points at the actual next step. It is the one disabled button in this app
 * that is defensible, because the reason is structural rather than a validation
 * the user could fix by typing.
 *
 * `key={`${day}-${resourceId}`}` ON THE BOOKING DRAWER
 *
 * Its time fields default to `${day}T09:00`, computed in a useState
 * initialiser — which runs once per mount. Change the day, reopen the drawer,
 * and without the key you would get the old day's times. Same mechanism as the
 * incident and vendor drawers.
 */
