"use client";

import { AlertCircle, Mail, Pencil, Phone, Plus, Power, Truck } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  useActivateVendor,
  useCreateVendor,
  useDeactivateVendor,
  useUpdateVendor,
  useVendors,
} from "@/features/vendors/hooks";
import {
  VENDOR_STATUSES,
  isActive,
  type Vendor,
  type VendorStatus,
} from "@/features/vendors/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · One form, two jobs
// ─────────────────────────────────────────────────────────────────────────────

function VendorDrawer({
  open,
  vendor,
  onClose,
}: {
  open: boolean;
  /** null = creating, a vendor = editing it. */
  vendor: Vendor | null;
  onClose: () => void;
}) {
  const ids = {
    name: useId(),
    category: useId(),
    contactName: useId(),
    contactEmail: useId(),
    contactPhone: useId(),
    notes: useId(),
  };

  const editing = vendor !== null;

  const [name, setName] = useState(vendor?.name ?? "");
  const [category, setCategory] = useState(vendor?.category ?? "");
  const [contactName, setContactName] = useState(vendor?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(vendor?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(vendor?.contactPhone ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [touched, setTouched] = useState(false);

  const create = useCreateVendor();
  const update = useUpdateVendor();
  const mutation = editing ? update : create;

  const emailLooksWrong =
    contactEmail.trim().length > 0 && !contactEmail.includes("@");

  const errors = {
    name: name.trim() ? undefined : "Name the vendor.",
    contactEmail: emailLooksWrong ? "That does not look like an email address." : undefined,
  };
  const isValid = !errors.name && !errors.contactEmail;

  function close() {
    setTouched(false);
    create.reset();
    update.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      name: name.trim(),
      ...(category.trim() && { category: category.trim() }),
      ...(contactName.trim() && { contactName: contactName.trim() }),
      ...(contactEmail.trim() && { contactEmail: contactEmail.trim() }),
      ...(contactPhone.trim() && { contactPhone: contactPhone.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: vendor.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      close();
    } catch (cause) {
      console.error("[vendor] sent:", payload);
      console.error("[vendor] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  const text = (
    id: string,
    label: string,
    value: string,
    setValue: (next: string) => void,
    placeholder: string,
    required = false,
    error?: string,
    type: string = "text",
  ) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-md font-semibold text-text-strong">
        {label} {required ? <span className="text-error">*</span> : (
          <span className="font-normal text-text-muted">(optional)</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={`${fieldBase} ${
          touched && error ? "border-error" : "border-border-subtle"
        }`}
      />
      {touched && error ? (
        <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
          <AlertCircle size={14} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={close}
      title={editing ? "Edit vendor" : "Add a vendor"}
      description={
        editing
          ? "Only the fields you change are sent."
          : "A supplier the company buys from."
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
            form="vendor-form"
            disabled={mutation.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {mutation.isPending
              ? editing
                ? "Saving…"
                : "Adding…"
              : editing
                ? "Save changes"
                : "Add vendor"}
          </button>
        </>
      }
    >
      <form id="vendor-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {text(ids.name, "Name", name, setName, "Acme Office Supplies", true, errors.name)}
        {text(ids.category, "Category", category, setCategory, "Office Supplies")}
        {text(ids.contactName, "Contact name", contactName, setContactName, "John Smith")}
        {text(
          ids.contactEmail,
          "Contact email",
          contactEmail,
          setContactEmail,
          "john@acme.example",
          false,
          errors.contactEmail,
          "email",
        )}
        {text(ids.contactPhone, "Contact phone", contactPhone, setContactPhone, "+1-555-0100", false, undefined, "tel")}

        <div className="flex flex-col gap-2">
          <label htmlFor={ids.notes} className="text-body-md font-semibold text-text-strong">
            Notes <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id={ids.notes}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Preferred supplier"
            className="w-full resize-y rounded-field border border-border-subtle bg-surface-raised px-4 py-3 text-body-md text-text-strong outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </form>
    </Drawer>
  );
}

/*
 * ONE DRAWER FOR CREATE AND EDIT, BECAUSE THE TWO PAYLOADS ARE THE SAME SHAPE.
 *
 * POST /vendors and PUT /vendors/{id} take identical fields; the only
 * difference is that every field is optional on update. So the form is
 * identical and `editing` picks the mutation, the title and the button label.
 *
 * The initial state reads from `vendor?.field ?? ""` at MOUNT. That only works
 * because the parent gives this component a `key` tied to the vendor id — the
 * useState initialiser runs once per mount, so without the key, opening a
 * second vendor would show the first one's details. Same mechanism as the
 * incident resolve drawer, and the same reason: resetting in an effect is a
 * cascading render the compiler rejects.
 *
 * THE EMAIL CHECK IS `includes("@")` AND NOT A REGEX
 *
 * Email regexes are famously wrong — they reject valid addresses with
 * apostrophes, plus-addressing or new TLDs, and the failure mode is "the app
 * refuses to let me type my own address". The only client-side check worth
 * making is the one that catches an obvious slip, and the server validates
 * properly. Anything stricter here is a liability.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The list
// ─────────────────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <Skeleton className="h-10 w-10 shrink-0" rounded="field" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="40%" />
        <SkeletonText width="60%" className="h-3" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" rounded="pill" />
    </li>
  );
}

export function VendorList() {
  const [status, setStatus] = useState<VendorStatus | "">("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);

  const filters = useMemo(() => (status ? { status } : {}), [status]);
  const { data, isLoading, error } = useVendors(filters);

  const activate = useActivateVendor();
  const deactivate = useDeactivateVendor();
  const busy = activate.isPending || deactivate.isPending;

  const vendors = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">Could not load vendors.</p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as VendorStatus | "")}
          aria-label="Filter by status"
          className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
        >
          <option value="">All vendors</option>
          {VENDOR_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto"
        >
          <Plus size={16} aria-hidden />
          Add vendor
        </button>
      </div>

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </ul>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <Truck size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                {status ? "None with that status" : "No vendors yet"}
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {status
                  ? "Try clearing the filter."
                  : "Add the suppliers the company buys from."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {vendors.map((vendor) => {
              const live = isActive(vendor);

              return (
                <li key={vendor.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-field ${
                      live ? "bg-primary/10 text-primary" : "bg-surface-sunk text-text-subtle"
                    }`}
                  >
                    <Truck size={17} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-body-md font-semibold text-text-strong">
                      {vendor.name}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm text-text-muted">
                      {vendor.category ? <span>{vendor.category}</span> : null}
                      {vendor.contactName ? <span>{vendor.contactName}</span> : null}
                      {vendor.contactEmail ? (
                        <a
                          href={`mailto:${vendor.contactEmail}`}
                          className="flex min-w-0 items-center gap-1.5 hover:text-primary hover:underline"
                        >
                          <Mail size={13} className="shrink-0" aria-hidden />
                          <span className="truncate">{vendor.contactEmail}</span>
                        </a>
                      ) : null}
                      {vendor.contactPhone ? (
                        <a
                          href={`tel:${vendor.contactPhone}`}
                          className="flex items-center gap-1.5 hover:text-primary hover:underline"
                        >
                          <Phone size={13} className="shrink-0" aria-hidden />
                          {vendor.contactPhone}
                        </a>
                      ) : null}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${
                      live ? "bg-primary/12 text-primary" : "bg-surface-sunk text-text-subtle"
                    }`}
                  >
                    {live ? "Active" : "Inactive"}
                  </span>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(vendor)}
                      aria-label={`Edit ${vendor.name}`}
                      className="grid h-11 w-11 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-surface-sunk hover:text-text-strong"
                    >
                      <Pencil size={17} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        live ? deactivate.mutate(vendor.id) : activate.mutate(vendor.id)
                      }
                      disabled={busy}
                      aria-label={`${live ? "Deactivate" : "Activate"} ${vendor.name}`}
                      className={`grid h-11 w-11 place-items-center rounded-pill transition-colors disabled:opacity-40 ${
                        live
                          ? "text-text-subtle hover:bg-error/10 hover:text-error"
                          : "text-text-subtle hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <Power size={17} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <VendorDrawer
        key="create"
        open={creating}
        vendor={null}
        onClose={() => setCreating(false)}
      />
      <VendorDrawer
        key={`edit-${editing?.id ?? "none"}`}
        open={editing !== null}
        vendor={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

/*
 * THE CONTACT DETAILS ARE `mailto:` AND `tel:` LINKS, NOT PLAIN TEXT.
 *
 * The entire reason to open this page is to contact a supplier. A tappable
 * phone number on a phone — and this app is heading into a React Native WebView
 * — turns a page view into a phone call. Plain text turns it into copying a
 * number by hand.
 *
 * TWO DRAWER INSTANCES RATHER THAN ONE
 *
 * The create drawer and the edit drawer are the same component mounted twice
 * with different keys. Sharing one instance would mean `vendor` switching
 * between null and an object while it is open, and the useState initialisers
 * would not re-run — so "Add vendor" clicked after editing someone would come
 * up pre-filled with their details. Two mounts, two independent lifetimes.
 *
 * `key="create"` is constant, so that instance mounts once and keeps its state
 * across opens — which is arguably a feature: a half-typed vendor survives an
 * accidental close. If that turns out to be surprising, key it to a counter
 * that increments on open.
 */
