"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  PhoneCall,
  Receipt,
  ShieldAlert,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useOpsPulse } from "@/features/ops-pulse/hooks";
import type { OpsPulse } from "@/features/ops-pulse/types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · What each number means
// ─────────────────────────────────────────────────────────────────────────────

interface Metric {
  key: keyof OpsPulse;
  label: string;
  caption: string;
  icon: LucideIcon;
  href: string;
  /** Above zero this is a demand, not an observation. */
  attention?: boolean;
}

const METRICS: Metric[] = [
  {
    key: "pendingLeaves",
    label: "Leave requests",
    caption: "waiting on a decision",
    icon: CalendarCheck,
    href: "/leaves",
  },
  {
    key: "pendingExpenses",
    label: "Expense claims",
    caption: "waiting on review",
    icon: Receipt,
    href: "/expenses",
  },
  {
    key: "openIncidents",
    label: "Open incidents",
    caption: "not yet resolved",
    icon: ShieldAlert,
    href: "/incidents",
  },
  {
    key: "criticalIncidents",
    label: "Critical incidents",
    caption: "need attention now",
    icon: AlertTriangle,
    href: "/incidents",
    attention: true,
  },
  {
    key: "onCallCount",
    label: "On call",
    caption: "covering right now",
    icon: PhoneCall,
    href: "/incidents/on-call",
  },
  {
    key: "todayCheckIns",
    label: "Checked in",
    caption: "so far today",
    icon: Clock,
    href: "/attendance",
  },
];

/*
 * The inspiration's tiles pair a number with a period-on-period delta
 * ("+6%", "-11%"). Your API has no historical series, so any delta here would be
 * fabricated. Each tile carries a caption instead — what the number counts,
 * rather than a trend that does not exist.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · One tile
// ─────────────────────────────────────────────────────────────────────────────

function PulseTile({
  metric,
  value,
  isLoading,
}: {
  metric: Metric;
  value: number | undefined;
  isLoading: boolean;
}) {
  const Icon = metric.icon;
  const urgent = metric.attention && (value ?? 0) > 0;

  return (
    <Link
      href={metric.href}
      prefetch={false}
      className={`group relative flex flex-col gap-5 rounded-card p-6 shadow-card
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float
        ${urgent ? "bg-error/8 ring-1 ring-error/25" : "bg-surface-raised"}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-11 w-11 place-items-center rounded-field
            ${urgent ? "bg-error/15 text-error" : "bg-surface-sunk text-text-muted"}`}
        >
          <Icon size={20} aria-hidden />
        </span>

        <ArrowUpRight
          size={18}
          aria-hidden
          className="text-text-subtle transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
        />
      </div>

      <div>
        {isLoading ? (
          <Skeleton className="h-10 w-20" />
        ) : (
          <p
            className={`text-h2 leading-none tabular-nums
              ${urgent ? "text-error" : "text-text-strong"}`}
          >
            {value ?? 0}
          </p>
        )}

        <p className="mt-3 text-body-lg font-semibold text-text-strong">
          {metric.label}
        </p>
        <p className="text-body-md text-text-muted">{metric.caption}</p>
      </div>
    </Link>
  );
}

/*
 * WHAT CHANGED FROM THE FIRST VERSION, AND WHY
 *
 * Border -> shadow.   A hairline border around every card makes each one look
 *                     boxed in. Lifting them off a tinted ground separates them
 *                     without drawing twelve extra lines on the page.
 *
 * 12px -> 20px radius. Softer corners are most of what reads as "modern" here.
 *
 * Icon in a chip.     A filled rounded square gives the eye somewhere to land
 *                     before the number, which is what the inspiration does.
 *
 * Number leads.       Value first at h2, then label, then caption. Three sizes
 *                     in one block, so the hierarchy is obvious at a glance.
 *
 * Hover lifts.        `-translate-y-0.5` plus a heavier shadow. Small enough not
 *                     to be a distraction, clear enough to say "this is a link".
 *
 * URGENCY IS NOT JUST COLOUR
 *
 * A non-zero critical count changes the fill, the ring, the icon chip and the
 * number colour together. Red alone would be invisible to anyone who cannot
 * distinguish it, and would compete with the green brand accent besides.
 *
 * `prefetch={false}` because most of these routes are still empty files. Next
 * prefetches links in the viewport by default, which would fire requests for
 * pages that cannot render. Remove it per link as each page lands.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The grid
// ─────────────────────────────────────────────────────────────────────────────

export function PulseGrid() {
  const { data, isLoading, error } = useOpsPulse();

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-6 ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load your operations summary.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {METRICS.map((metric) => (
        <PulseTile
          key={metric.key}
          metric={metric}
          value={data?.[metric.key]}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
