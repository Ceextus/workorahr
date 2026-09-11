"use client";

import { AlertCircle, Laptop, Plus, Undo2, UserPlus } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  useAssets,
  useAssignAsset,
  useCreateAsset,
  useMyAssets,
  useReturnAsset,
} from "@/features/assets/hooks";
import { isAssigned, type Asset } from "@/features/assets/types";
import { useEmployees } from "@/features/employees/hooks";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Add an asset
// ─────────────────────────────────────────────────────────────────────────────

function NewAssetDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nameId = useId();
  const categoryId = useId();
  const serialId = useId();
  const notesId = useId();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useCreateAsset();

  const errors = {
    name: name.trim() ? undefined : "Name the asset.",
    category: category.trim() ? undefined : "Give it a category.",
  };
  const isValid = !errors.name && !errors.category;

  function close() {
    setName("");
    setCategory("");
    setSerialNumber("");
    setNotes("");
    setTouched(false);
    create.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      name: name.trim(),
      category: category.trim(),
      ...(serialNumber.trim() && { serialNumber: serialNumber.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    try {
      await create.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[create asset] sent:", payload);
      console.error("[create asset] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add an asset"
      description="Something the company owns and lends out."
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
            form="new-asset-form"
            disabled={create.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {create.isPending ? "Adding…" : "Add asset"}
          </button>
        </>
      }
    >
      <form id="new-asset-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-body-md font-semibold text-text-strong">
            Name <span className="text-error">*</span>
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder='MacBook Pro 16"'
            className={`h-12 ${fieldBase} ${
              touched && errors.name ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.name ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={categoryId} className="text-body-md font-semibold text-text-strong">
            Category <span className="text-error">*</span>
          </label>
          <input
            id={categoryId}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Laptop"
            list="asset-categories"
            className={`h-12 ${fieldBase} ${
              touched && errors.category ? "border-error" : "border-border-subtle"
            }`}
          />
          {/*
            A datalist, not a select. `category` is a free string in the API —
            there is no enum — so the field must accept anything while still
            nudging people towards consistent spelling.
          */}
          <datalist id="asset-categories">
            <option value="Laptop" />
            <option value="Monitor" />
            <option value="Phone" />
            <option value="Peripheral" />
            <option value="Furniture" />
            <option value="Vehicle" />
          </datalist>
          {touched && errors.category ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.category}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={serialId} className="text-body-md font-semibold text-text-strong">
            Serial number <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            id={serialId}
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            placeholder="SN-12345"
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
          <p className="text-body-sm text-text-subtle">
            Double-check this — asset details cannot be edited once saved.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={notesId} className="text-body-md font-semibold text-text-strong">
            Notes <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Provisioned for engineering"
            className={`resize-y py-3 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Assign
// ─────────────────────────────────────────────────────────────────────────────

function AssignDrawer({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const selectId = useId();
  const [employeeId, setEmployeeId] = useState("");
  const assign = useAssignAsset();

  // /assets/{id}/assign takes an employee id, which GET /employees provides
  // directly. Incidents use UserPicker instead, which resolves the linked
  // user id — different key space, same idea.
  const { data: employees, isLoading } = useEmployees();

  const active = useMemo(
    () => (employees ?? []).filter((employee) => employee.active !== false),
    [employees],
  );

  function close() {
    setEmployeeId("");
    assign.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!asset || !employeeId) return;

    try {
      await assign.mutateAsync({ id: asset.id, employeeId });
      close();
    } catch (cause) {
      console.error("[assign asset] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={asset !== null}
      onClose={close}
      title="Assign asset"
      description={asset ? `${asset.name} — ${asset.category}` : ""}
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
            form="assign-asset-form"
            disabled={assign.isPending || !employeeId}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {assign.isPending ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      <form id="assign-asset-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={selectId} className="text-body-md font-semibold text-text-strong">
            Give it to <span className="text-error">*</span>
          </label>
          <select
            id={selectId}
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            disabled={isLoading}
            className={`h-12 ${fieldBase} border-border-subtle`}
          >
            <option value="">{isLoading ? "Loading people…" : "Choose someone"}</option>
            {active.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
                {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Return
// ─────────────────────────────────────────────────────────────────────────────

function ReturnDrawer({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const notesId = useId();
  const [conditionNotes, setConditionNotes] = useState("");
  const returnAsset = useReturnAsset();

  function close() {
    setConditionNotes("");
    returnAsset.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!asset) return;

    try {
      await returnAsset.mutateAsync({
        id: asset.id,
        conditionNotes: conditionNotes.trim() || undefined,
      });
      close();
    } catch (cause) {
      console.error("[return asset] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={asset !== null}
      onClose={close}
      title="Return asset"
      description={asset ? `${asset.name} comes back into stock.` : ""}
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
            form="return-asset-form"
            disabled={returnAsset.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {returnAsset.isPending ? "Returning…" : "Return it"}
          </button>
        </>
      }
    >
      <form id="return-asset-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={notesId} className="text-body-md font-semibold text-text-strong">
            Condition notes <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={notesId}
            value={conditionNotes}
            onChange={(event) => setConditionNotes(event.target.value)}
            rows={4}
            placeholder="Minor scratches on the lid"
            className={`resize-y py-3 ${fieldBase} border-border-subtle`}
          />
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · One row
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  asset,
  nameById,
  canManage,
  onAssign,
  onReturn,
}: {
  asset: Asset;
  nameById?: Map<string, string>;
  canManage: boolean;
  onAssign: (asset: Asset) => void;
  onReturn: (asset: Asset) => void;
}) {
  const held = isAssigned(asset);
  const holder =
    asset.assignedToName ??
    (asset.assignedToEmployeeId
      ? (nameById?.get(asset.assignedToEmployeeId) ?? asset.assignedToEmployeeId)
      : null);

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-field ${
          held ? "bg-secondary/20 text-grey-900" : "bg-primary/10 text-primary"
        }`}
      >
        <Laptop size={17} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="break-words text-body-md font-semibold text-text-strong">
          {asset.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-text-muted">
          <span>{asset.category}</span>
          {asset.serialNumber ? (
            <>
              <span aria-hidden>·</span>
              <span className="break-all">{asset.serialNumber}</span>
            </>
          ) : null}
          {held && holder ? (
            <>
              <span aria-hidden>·</span>
              <span className="break-all font-semibold text-text-strong">{holder}</span>
            </>
          ) : null}
          {asset.assignedAt && held ? (
            <>
              <span aria-hidden>·</span>
              <span>since {formatDate(asset.assignedAt)}</span>
            </>
          ) : null}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${
          held ? "bg-secondary/20 text-grey-900" : "bg-primary/12 text-primary"
        }`}
      >
        {held ? "In use" : "In stock"}
      </span>

      {canManage ? (
        <button
          type="button"
          onClick={() => (held ? onReturn(asset) : onAssign(asset))}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
        >
          {held ? (
            <>
              <Undo2 size={16} aria-hidden />
              Return
            </>
          ) : (
            <>
              <UserPlus size={16} aria-hidden />
              Assign
            </>
          )}
        </button>
      ) : null}
    </li>
  );
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <Skeleton className="h-10 w-10 shrink-0" rounded="field" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="45%" />
        <SkeletonText width="65%" className="h-3" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" rounded="pill" />
    </li>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
        <Laptop size={22} aria-hidden />
      </span>
      <div>
        <p className="text-body-lg font-semibold text-text-strong">{title}</p>
        <p className="mt-1 max-w-sm text-body-md text-text-muted">{body}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · What I am holding
// ─────────────────────────────────────────────────────────────────────────────

export function MyAssets() {
  const { data, isLoading, error } = useMyAssets();

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load your assets.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
      {isLoading ? (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {[0, 1].map((row) => (
            <RowSkeleton key={row} />
          ))}
        </ul>
      ) : !data?.length ? (
        <EmptyState
          title="Nothing signed out to you"
          body="Anything the company lends you appears here."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {data.map((asset) => (
            <Row
              key={asset.id}
              asset={asset}
              canManage={false}
              onAssign={() => {}}
              onReturn={() => {}}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 6 · The register [HR/Admin]
// ─────────────────────────────────────────────────────────────────────────────

export function AssetRegister({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error } = useAssets({ enabled: canManage });
  const { data: employees } = useEmployees(undefined, { enabled: canManage });

  const [newOpen, setNewOpen] = useState(false);
  const [assigning, setAssigning] = useState<Asset | null>(null);
  const [returning, setReturning] = useState<Asset | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employees ?? []) {
      map.set(employee.id, `${employee.firstName} ${employee.lastName}`);
    }
    return map;
  }, [employees]);

  const assets = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        // In stock first — that is the list someone assigning kit needs.
        const byState = Number(isAssigned(a)) - Number(isAssigned(b));
        if (byState !== 0) return byState;
        return a.name.localeCompare(b.name);
      }),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load the asset register.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setNewOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto sm:w-fit"
      >
        <Plus size={16} aria-hidden />
        Add asset
      </button>

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2, 3].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </ul>
        ) : assets.length === 0 ? (
          <EmptyState
            title="Nothing catalogued yet"
            body="Add the first laptop, monitor or phone and it can be signed out to someone."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {assets.map((asset) => (
              <Row
                key={asset.id}
                asset={asset}
                nameById={nameById}
                canManage
                onAssign={setAssigning}
                onReturn={setReturning}
              />
            ))}
          </ul>
        )}
      </div>

      <NewAssetDrawer open={newOpen} onClose={() => setNewOpen(false)} />
      {/* `key` remounts these so a previous selection's state never leaks. */}
      <AssignDrawer
        key={`assign-${assigning?.id ?? "none"}`}
        asset={assigning}
        onClose={() => setAssigning(null)}
      />
      <ReturnDrawer
        key={`return-${returning?.id ?? "none"}`}
        asset={returning}
        onClose={() => setReturning(null)}
      />
    </div>
  );
}

/*
 * ONE BUTTON THAT CHANGES MEANING, RATHER THAN TWO THAT TAKE TURNS BEING
 * DISABLED.
 *
 * An asset is either in stock or with somebody, so "Assign" and "Return" are
 * never both valid. Rendering both and disabling one wastes a tap target and
 * makes the row wider on a phone for no information gained. The single button
 * reads the state and offers the only action that exists.
 *
 * THE EMPLOYEE NAME MAP IS BUILT LOCALLY RATHER THAN VIA `useEmployeeNameMap()`
 *
 * The shared hook fetches unconditionally. This page only needs it for HR, and
 * an EMPLOYEE viewing /assets would fire a request whose result is never
 * rendered. `useEmployees(undefined, { enabled: canManage })` skips it
 * entirely, and the eight lines of `useMemo` are the cost of that.
 *
 * `useAssets({ enabled: canManage })` DOES THE SAME FOR THE REGISTER
 *
 * GET /assets is HR/Admin. Rendering this component for anyone else would fire
 * a guaranteed 403 — so the query does not run at all rather than running and
 * failing quietly. The parent page also does not render it, which makes this
 * belt and braces, and the belt is the one that would survive someone reusing
 * the component elsewhere.
 */
