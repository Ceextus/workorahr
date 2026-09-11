"use client";

import type { LucideIcon } from "lucide-react";
import { Boxes, Laptop, MoreHorizontal, Plane, UtensilsCrossed } from "lucide-react";

import type { ExpenseCategory, ExpenseStatus } from "@/features/expenses/types";

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ExpenseStatus, string> = {
  PENDING: "bg-secondary/20 text-[#7a5c05]",
  APPROVED: "bg-blue/10 text-blue",
  REJECTED: "bg-error/10 text-error",
  PAID: "bg-primary/10 text-primary",
};

const STATUS_DOT: Record<ExpenseStatus, string> = {
  PENDING: "bg-secondary",
  APPROVED: "bg-blue",
  REJECTED: "bg-error",
  PAID: "bg-primary",
};

export function ExpenseStatusChip({ status }: { status: ExpenseStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${STATUS_STYLE[status]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-pill ${STATUS_DOT[status]}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/*
 * FOUR STATES, AND APPROVED IS NOT THE END
 *
 * Leave has one terminal success state. An expense has two steps after PENDING:
 * APPROVED means "we agree you should be paid", PAID means "you have been".
 *
 * So APPROVED gets blue rather than green — green is reserved for PAID, the
 * state that actually closes the claim. Colouring both green would hide the one
 * distinction that matters to whoever is owed money.
 *
 * `Record<ExpenseStatus, ...>` rather than a switch: add a fifth status and
 * TypeScript flags both maps as incomplete, where a switch with a default would
 * silently render it grey.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<ExpenseCategory, LucideIcon> = {
  TRAVEL: Plane,
  MEALS: UtensilsCrossed,
  SUPPLIES: Boxes,
  SOFTWARE: Laptop,
  OTHER: MoreHorizontal,
};

export function categoryLabel(category: ExpenseCategory) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: ExpenseCategory;
  size?: number;
}) {
  const Icon = CATEGORY_ICON[category];
  return <Icon size={size} aria-hidden />;
}
