export const VENDOR_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  status?: VendorStatus | null;
  /** Some backends express the same thing as a boolean. See `isActive`. */
  active?: boolean | null;
  createdAt?: string | null;
}

export interface VendorFilters {
  status?: VendorStatus;
}

export interface CreateVendorPayload {
  name: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

/** Every field optional — only non-null ones are applied. */
export type UpdateVendorPayload = Partial<CreateVendorPayload>;

export function isActive(vendor: Vendor): boolean {
  if (typeof vendor.active === "boolean") return vendor.active;
  if (vendor.status) return vendor.status === "ACTIVE";
  // Neither field present: assume usable rather than hiding a real supplier.
  return true;
}

/*
 * `status` IS DOCUMENTED AS A FILTER, NOT AS A RESPONSE FIELD.
 *
 * GET /vendors?status=ACTIVE|INACTIVE proves the backend knows the concept, and
 * POST /vendors/{id}/activate and /deactivate prove it is mutable. What the
 * docs never show is what a vendor object actually looks like coming back —
 * `status: "ACTIVE"` and `active: true` are both plausible.
 *
 * So `isActive` accepts either, in the same spirit as `isUnread` in
 * features/notifications/types.ts. The difference is the default: an unknown
 * notification is treated as read (fail quiet), an unknown vendor as active
 * (fail visible). Getting it wrong for a notification means a stuck badge;
 * getting it wrong here means a supplier the company actually uses silently
 * disappears from the list.
 */
