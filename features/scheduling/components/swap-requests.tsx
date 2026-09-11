"use client";

import { AlertCircle, Ban, Check, Repeat, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useEmployeeNameMap, useEmployees } from "@/features/employees/hooks";
import {
  useApproveSwap,
  useCancelSwap,
  useCreateSwapRequest,
  useRejectSwap,
  useRoster,
  useSwapRequests,
} from "@/features/scheduling/hooks";
import {
  SWAP_STATUSES,
  type SwapRequest,
  type SwapStatus,
} from "@/features/scheduling/types";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

const STATUS_STYLE: Record<SwapStatus, string> = {
  PENDING: "bg-secondary/20 text-grey-900",
  APPROVED: "bg-primary/12 text-primary",
  REJECTED: "bg-error/12 text-error",
  CANCELLED: "bg-surface-sunk text-text-subtle",
};

function todayValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + count);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Ask for a swap
// ─────────────────────────────────────────────────────────────────────────────

function NewSwapDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const assignmentField = useId();
  const proposedField = useId();
  const reasonField = useId();

  const [shiftAssignmentId, setShiftAssignmentId] = useState("");
  const [proposedToEmployeeId, setProposedToEmployeeId] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  // The shifts someone might want to swap are the upcoming ones.
  const range = useMemo(() => {
    const start = todayValue();
    return { start, end: addDays(start, 30) };
  }, []);

  const { data: roster, isLoading: rosterLoading } = useRoster(range);
  const { data: employees } = useEmployees();
  const create = useCreateSwapRequest();

  const assignmentError = shiftAssignmentId ? undefined : "Choose the shift you want covered.";

  function close() {
    setShiftAssignmentId("");
    setProposedToEmployeeId("");
    setReason("");
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (assignmentError) return;

    const payload = {
      shiftAssignmentId,
      // null, not omitted — the docs show `"proposedToEmployeeId": null` for an
      // open request, so this mirrors the documented body exactly.
      proposedToEmployeeId: proposedToEmployeeId || null,
      ...(reason.trim() && { reason: reason.trim() }),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[create swap] sent:", payload);
      console.error("[create swap] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Request a swap"
      description="Ask somebody to take a shift you cannot work."
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
            form="new-swap-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Requesting…" : "Request swap"}
          </button>
        </>
      }
    >
      <form id="new-swap-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={assignmentField} className="text-body-md font-semibold text-text-strong">
            Which shift <span className="text-error">*</span>
          </label>
          <select
            id={assignmentField}
            value={shiftAssignmentId}
            onChange={(event) => setShiftAssignmentId(event.target.value)}
            disabled={rosterLoading}
            className={`h-12 ${fieldBase} ${
              touched && assignmentError ? "border-error" : "border-border-subtle"
            }`}
          >
            <option value="">
              {rosterLoading ? "Loading the rota…" : "Choose a rostered shift"}
            </option>
            {(roster ?? []).map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {formatDate(assignment.date)} ·{" "}
                {assignment.shiftName ?? "Shift"} ·{" "}
                {assignment.employeeName ?? assignment.employeeId.slice(0, 8)}
              </option>
            ))}
          </select>
          <p className="text-body-sm text-text-subtle">
            The next 30 days of the rota.
          </p>
          {touched && assignmentError ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {assignmentError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={proposedField} className="text-body-md font-semibold text-text-strong">
            Ask someone specific{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <select
            id={proposedField}
            value={proposedToEmployeeId}
            onChange={(event) => setProposedToEmployeeId(event.target.value)}
            className={`h-12 ${fieldBase} border-border-subtle`}
          >
            <option value="">Anyone can take it</option>
            {(employees ?? [])
              .filter((employee) => employee.active !== false)
              .map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
          </select>
          <p className="text-body-sm text-text-subtle">
            Leave it open and whoever approves the swap names the replacement.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={reasonField} className="text-body-md font-semibold text-text-strong">
            Reason <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={reasonField}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Doctor appointment"
            className={`resize-y py-3 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Approve, which sometimes needs a replacement
// ─────────────────────────────────────────────────────────────────────────────

function ApproveDrawer({
  request,
  onClose,
}: {
  request: SwapRequest | null;
  onClose: () => void;
}) {
  const replacementField = useId();
  const [replacementEmployeeId, setReplacementEmployeeId] = useState("");

  const { data: employees } = useEmployees();
  const approve = useApproveSwap();

  // "replacementEmployeeId is only required if the original request had no
  // proposedToEmployeeId."
  const needsReplacement = request ? !request.proposedToEmployeeId : false;
  const isValid = !needsReplacement || Boolean(replacementEmployeeId);

  function close() {
    setReplacementEmployeeId("");
    approve.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!request || !isValid) return;

    try {
      await approve.mutateAsync({
        id: request.id,
        ...(needsReplacement && { replacementEmployeeId }),
      });
      close();
    } catch (cause) {
      console.error("[approve swap] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={request !== null}
      onClose={close}
      title="Approve swap"
      description={
        needsReplacement
          ? "This request is open, so somebody has to be named."
          : "The request already names who is taking it."
      }
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
            form="approve-swap-form"
            disabled={approve.isPending || !isValid}
            className="h-12 flex-1 rounded-field bg-primary text-body-md font-semibold text-white transition-colors hover:bg-primary/90 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {approve.isPending ? "Approving…" : "Approve"}
          </button>
        </>
      }
    >
      <form id="approve-swap-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {request ? (
          <div className="flex flex-col gap-1 rounded-field bg-surface-sunk p-4">
            <p className="text-body-md font-bold text-text-strong">
              {request.shiftName ?? "Shift"}
              {request.date ? ` · ${formatDate(request.date)}` : ""}
            </p>
            {request.reason ? (
              <p className="break-words text-body-sm text-text-muted">{request.reason}</p>
            ) : null}
          </div>
        ) : null}

        {needsReplacement ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={replacementField}
              className="text-body-md font-semibold text-text-strong"
            >
              Who is taking it <span className="text-error">*</span>
            </label>
            <select
              id={replacementField}
              value={replacementEmployeeId}
              onChange={(event) => setReplacementEmployeeId(event.target.value)}
              className={`h-12 ${fieldBase} border-border-subtle`}
            >
              <option value="">Choose someone</option>
              {(employees ?? [])
                .filter((employee) => employee.active !== false)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <p className="rounded-field bg-surface-sunk p-4 text-body-md text-text-muted">
            {request?.proposedToName
              ? `${request.proposedToName} will take this shift.`
              : "The named colleague will take this shift."}
          </p>
        )}
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The queue
// ─────────────────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <Skeleton className="h-10 w-10 shrink-0" rounded="field" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="45%" />
        <SkeletonText width="65%" className="h-3" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0" rounded="pill" />
    </li>
  );
}

export function SwapRequestQueue({ canApprove }: { canApprove: boolean }) {
  const [status, setStatus] = useState<SwapStatus | "">("PENDING");
  const [newOpen, setNewOpen] = useState(false);
  const [approving, setApproving] = useState<SwapRequest | null>(null);

  const { data, isLoading, error } = useSwapRequests(status);
  const { nameById } = useEmployeeNameMap();
  const reject = useRejectSwap();
  const cancel = useCancelSwap();

  const busy = reject.isPending || cancel.isPending;

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load swap requests.
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
          onChange={(event) => setStatus(event.target.value as SwapStatus | "")}
          aria-label="Filter by status"
          className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
        >
          <option value="">Any status</option>
          {SWAP_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto"
        >
          <Repeat size={16} aria-hidden />
          Request swap
        </button>
      </div>

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </ul>
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <Repeat size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                {status === "PENDING" ? "Nothing waiting" : "Nothing here"}
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {status === "PENDING"
                  ? "No swap requests need a decision."
                  : "Try a different status."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.map((request) => {
              const pending = request.status === "PENDING";
              const requester =
                request.requestedByName ??
                (request.requestedByEmployeeId
                  ? (nameById.get(request.requestedByEmployeeId) ??
                    request.requestedByEmployeeId.slice(0, 8))
                  : "Someone");
              const proposed =
                request.proposedToName ??
                (request.proposedToEmployeeId
                  ? (nameById.get(request.proposedToEmployeeId) ??
                    request.proposedToEmployeeId.slice(0, 8))
                  : null);

              return (
                <li key={request.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                    <Repeat size={17} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-body-md font-semibold text-text-strong">
                      {requester} → {proposed ?? "anyone"}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-text-muted">
                      {request.shiftName ? <span>{request.shiftName}</span> : null}
                      {request.date ? (
                        <>
                          {request.shiftName ? <span aria-hidden>·</span> : null}
                          <span>{formatDate(request.date)}</span>
                        </>
                      ) : null}
                      {request.reason ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="break-words">{request.reason}</span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${
                      STATUS_STYLE[request.status] ?? STATUS_STYLE.CANCELLED
                    }`}
                  >
                    {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                  </span>

                  {pending ? (
                    <div className="flex shrink-0 gap-1">
                      {canApprove ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setApproving(request)}
                            disabled={busy}
                            aria-label="Approve this swap"
                            className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                          >
                            <Check size={18} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => reject.mutate(request.id)}
                            disabled={busy}
                            aria-label="Reject this swap"
                            className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
                          >
                            <X size={18} aria-hidden />
                          </button>
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => cancel.mutate(request.id)}
                        disabled={busy}
                        aria-label="Cancel this swap request"
                        title="Withdraw your own request"
                        className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-surface-sunk hover:text-text-strong disabled:opacity-40"
                      >
                        <Ban size={18} aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NewSwapDrawer open={newOpen} onClose={() => setNewOpen(false)} />
      <ApproveDrawer
        key={`approve-${approving?.id ?? "none"}`}
        request={approving}
        onClose={() => setApproving(null)}
      />
    </div>
  );
}

/*
 * APPROVE OPENS A DRAWER; REJECT AND CANCEL FIRE IMMEDIATELY.
 *
 * That asymmetry follows the API rather than a design preference. Approving an
 * *open* request needs a `replacementEmployeeId` — there is a decision to make,
 * so there has to be somewhere to make it. Reject and cancel take no body at
 * all, so a drawer would be a dialog with nothing in it.
 *
 * The drawer still opens for a directed request, where no replacement is
 * needed, and simply confirms who is taking the shift. Two different approve
 * flows depending on the request would be harder to learn than one that
 * sometimes asks an extra question.
 *
 * CANCEL IS SHOWN TO EVERYONE, APPROVE AND REJECT ONLY TO MANAGERS
 *
 * Cancel is the requester withdrawing their own request, so it cannot be
 * manager-gated — it is the one action an ordinary employee has here. The
 * backend decides whether this particular caller owns this particular request;
 * the frontend cannot, because the queue does not reliably say who asked.
 *
 * Which is the real gap in this screen: without a documented "my swap requests"
 * endpoint or a reliable `requestedByEmployeeId`, the cancel button is offered
 * on rows the viewer may not own, and they will find out by being refused. Two
 * things would fix it — a `GET /scheduling/swap-requests/me`, or
 * `requestedByEmployeeId` guaranteed in the response so this can compare it
 * against `useMyProfile()`.
 */
