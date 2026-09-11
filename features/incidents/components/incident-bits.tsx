"use client";

import type { IncidentSeverity, IncidentStatus } from "@/features/incidents/types";

const SEVERITY_STYLE: Record<IncidentSeverity, string> = {
  LOW: "bg-surface-sunk text-text-muted",
  MEDIUM: "bg-secondary/20 text-grey-900",
  HIGH: "bg-warning/15 text-warning",
  CRITICAL: "bg-error/12 text-error",
};

const STATUS_STYLE: Record<IncidentStatus, string> = {
  OPEN: "bg-error/12 text-error",
  ACKNOWLEDGED: "bg-secondary/20 text-grey-900",
  RESOLVED: "bg-primary/12 text-primary",
  CLOSED: "bg-surface-sunk text-text-subtle",
};

/** "ACKNOWLEDGED" → "Acknowledged" */
function pretty(value: string): string {
  const words = value.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-body-sm font-bold ${
        SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.LOW
      }`}
    >
      {pretty(severity)}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-body-sm font-semibold ${
        STATUS_STYLE[status] ?? STATUS_STYLE.CLOSED
      }`}
    >
      {pretty(status)}
    </span>
  );
}

/*
 * SEVERITY AND STATUS GET DIFFERENT VISUAL WEIGHT, DELIBERATELY.
 *
 * Severity is `font-bold`, status is `font-semibold`. On a page full of rows
 * the question "what is on fire?" should be answerable before the question
 * "what stage is it at?", and CRITICAL in red-bold is the thing the eye should
 * land on first.
 *
 * The two scales also collide in an interesting way: an OPEN incident and a
 * CRITICAL one are both red. That is intentional — an open critical incident
 * shows two red badges and is unmissable, while a closed low-severity one is
 * two greys and recedes. The colours are doing the triage.
 *
 * `?? SEVERITY_STYLE.LOW` on the lookup even though the type is a closed union:
 * TypeScript guarantees the union at compile time and guarantees nothing about
 * what the server sends. If a fifth severity is added backend-first, this
 * renders it in the neutral style rather than with `className="undefined"`.
 */
