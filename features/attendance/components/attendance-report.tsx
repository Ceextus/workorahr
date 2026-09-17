"use client";

import { BarChart3, CalendarRange, Table2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useMonthlyReport } from "@/features/attendance/hooks";
import {
  ATTENDANCE_BANDS,
  type AttendanceBandKey,
  type AttendanceReportEntry,
} from "@/features/attendance/types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Series colours
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slot per band, in stacking order. The values live in globals.css as
 * `--chart-1..5` so light and dark each get their own validated steps and the
 * SVG needs no JavaScript to follow the theme.
 */
const BAND_VAR: Record<AttendanceBandKey, string> = {
  presentDays: "var(--chart-3)",
  lateDays: "var(--chart-4)",
  halfDays: "var(--chart-1)",
  onLeaveDays: "var(--chart-5)",
  absentDays: "var(--chart-2)",
};

/*
 * WHY CSS VARIABLES RATHER THAN HEX IN THE MARKUP
 *
 * This app toggles dark mode with a class on <html>, and an SVG `fill` is not a
 * Tailwind utility — `dark:fill-…` would mean shipping both palettes as classes
 * and hoping the scanner kept them. A custom property redefined under `.dark`
 * switches every mark at once, with no re-render and no JavaScript.
 *
 * The two palettes are NOT lightened copies of each other. Each was validated
 * separately against the surface it sits on (#ffffff and #1e2635) — lightness
 * band, chroma floor, CVD separation and contrast. An automatic flip fails the
 * band check.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Period picker
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function periodOptions(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const out: { year: number; month: number; label: string }[] = [];
  for (let back = 0; back < 12; back += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    out.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · One stacked row
// ─────────────────────────────────────────────────────────────────────────────

/** Bars are capped rather than filling the row; the leftover is deliberate air. */
const BAR_HEIGHT = 20;
/** Surface-coloured separation between touching segments. */
const GAP = 2;
const RADIUS = 4;

function Row({ entry, max }: { entry: AttendanceReportEntry; max: number }) {
  const present = ATTENDANCE_BANDS.map((band) => ({
    ...band,
    value: entry[band.key] ?? 0,
  })).filter((candidate) => candidate.value > 0);

  const total = present.reduce((sum, candidate) => sum + candidate.value, 0);

  /*
   * `x` is accumulated here rather than inside the JSX map. Mutating a running
   * offset in the render closure is what the React Compiler's immutability rule
   * rejects — and rightly: a re-render that reuses the memoised element list
   * would resume from a stale offset.
   */
  const scale = max > 0 ? total / max : 0;
  const segments = present.reduce<
    { key: AttendanceBandKey; label: string; value: number; x: number; width: number }[]
  >((acc, candidate) => {
    const width = total > 0 ? (candidate.value / total) * 100 * scale : 0;
    const x = acc.length === 0 ? 0 : acc[acc.length - 1].x + acc[acc.length - 1].width;
    return [...acc, { ...candidate, x, width }];
  }, []);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-body-md font-semibold text-text-strong">
          {entry.employeeName ?? entry.employeeId}
        </p>
        <p className="shrink-0 text-body-sm tabular-nums text-text-muted">
          {total} {total === 1 ? "day" : "days"}
        </p>
      </div>

      <svg
        viewBox={`0 0 100 ${BAR_HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: BAR_HEIGHT }}
        role="img"
        aria-label={segments
          .map((segment) => `${segment.label}: ${segment.value}`)
          .join(", ")}
      >
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          // 4px rounded data-end, square where it meets the next segment.
          const r = isLast ? RADIUS / 4 : 0;
          const drawWidth = Math.max(0, segment.width - (isLast ? 0 : GAP / 4));

          return (
            <rect
              key={segment.key}
              x={segment.x}
              y={0}
              width={drawWidth}
              height={BAR_HEIGHT}
              rx={r}
              fill={BAND_VAR[segment.key]}
            >
              <title>
                {segment.label}: {segment.value}{" "}
                {segment.value === 1 ? "day" : "days"}
              </title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · The report
// ─────────────────────────────────────────────────────────────────────────────

export function AttendanceReport() {
  const periods = useMemo(() => periodOptions(), []);
  const [index, setIndex] = useState(0);
  const [asTable, setAsTable] = useState(false);

  const period = periods[index];
  const { data, isLoading, error } = useMonthlyReport({
    year: period.year,
    month: period.month,
  });

  const rows = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => (b.totalRecordedDays ?? 0) - (a.totalRecordedDays ?? 0),
      ),
    [data],
  );

  const max = useMemo(
    () =>
      rows.reduce((highest, entry) => {
        const total = ATTENDANCE_BANDS.reduce(
          (sum, band) => sum + (entry[band.key] ?? 0),
          0,
        );
        return Math.max(highest, total);
      }, 0),
    [rows],
  );

  const totals = useMemo(() => {
    const out = {} as Record<AttendanceBandKey, number>;
    for (const band of ATTENDANCE_BANDS) {
      out[band.key] = rows.reduce((sum, entry) => sum + (entry[band.key] ?? 0), 0);
    }
    return out;
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls in one row above the chart. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2">
          <CalendarRange size={16} className="shrink-0 text-text-subtle" aria-hidden />
          <span className="sr-only">Month</span>
          <select
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
            className="h-11 rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {periods.map((option, optionIndex) => (
              <option key={option.label} value={optionIndex}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setAsTable((current) => !current)}
          aria-pressed={asTable}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field border border-border-strong px-4 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk sm:ml-auto"
        >
          {asTable ? <BarChart3 size={16} aria-hidden /> : <Table2 size={16} aria-hidden />}
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {/* Legend — always present for five series, so identity is never colour alone. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {ATTENDANCE_BANDS.map((band) => (
          <li key={band.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: BAND_VAR[band.key] }}
            />
            <span className="text-body-sm text-text-muted">
              {band.label}
              <span className="ml-1.5 font-semibold tabular-nums text-text-strong">
                {isLoading ? "—" : totals[band.key]}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
        {error ? (
          <div className="py-6 text-center">
            <p className="text-body-lg font-semibold text-error">
              Could not load the report.
            </p>
            <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col divide-y divide-border-subtle">
            {["55%", "70%", "40%", "62%", "48%"].map((width, row) => (
              <div key={row} className="flex flex-col gap-2 py-3">
                <SkeletonText width="9rem" />
                <Skeleton className="h-5" style={{ width }} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-body-lg font-semibold text-text-strong">
              Nothing recorded for {period.label}
            </p>
            <p className="mt-1 text-body-md text-text-muted">
              Attendance appears here once people start checking in.
            </p>
          </div>
        ) : asTable ? (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th scope="col" className="pb-3 pr-4 text-body-sm font-semibold uppercase tracking-wide text-text-muted">
                    Employee
                  </th>
                  {ATTENDANCE_BANDS.map((band) => (
                    <th
                      key={band.key}
                      scope="col"
                      className="pb-3 pl-4 text-right text-body-sm font-semibold uppercase tracking-wide text-text-muted"
                    >
                      {band.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.employeeId} className="border-t border-border-subtle">
                    <td className="py-3 pr-4 text-body-md font-semibold text-text-strong">
                      {entry.employeeName ?? entry.employeeId}
                    </td>
                    {ATTENDANCE_BANDS.map((band) => (
                      <td
                        key={band.key}
                        className="py-3 pl-4 text-right text-body-md tabular-nums text-text-muted"
                      >
                        {entry[band.key] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border-subtle">
            {rows.map((entry) => (
              <Row key={entry.employeeId} entry={entry} max={max} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * THE TABLE VIEW IS REQUIRED, NOT A NICETY.
 *
 * Three of the five light-mode series sit below 3:1 contrast against a white
 * card — that is inherent to a five-hue categorical palette, and the validator
 * flags it as a WARN that obligates "visible labels or a table view". The toggle
 * is how that obligation is met, and it doubles as the accessible alternative
 * for anyone the colours do not work for.
 *
 * The legend carries a running total per band, so the headline numbers are
 * readable as text without decoding a single bar.
 *
 * HORIZONTAL BARS BECAUSE THE CATEGORY NAMES ARE PEOPLE
 *
 * Vertical columns would need rotated or truncated names under every bar.
 * Horizontal rows give each name a full line at normal reading angle, and the
 * list grows downward, which is the direction a page already scrolls.
 *
 * WHY EACH BAR IS SCALED TO THE BUSIEST EMPLOYEE
 *
 * Every row normalised to 100% would make a person with 2 recorded days look
 * identical to one with 22 — the proportions would match and the magnitudes
 * would vanish. Scaling total width by `total / max` keeps the part-to-whole
 * reading inside each bar while letting row length carry the magnitude.
 *
 * `preserveAspectRatio="none"` WITH A 0–100 VIEWBOX
 *
 * Widths are computed as percentages and the SVG is stretched to whatever the
 * container is. That means no measuring the DOM, no resize observer, and the
 * chart is correct at first paint including during SSR — worth more here than
 * the geometric purity of a fixed-width viewBox.
 *
 * The 2px surface gap and 4px rounded end are expressed in viewBox units
 * (divided by 4) rather than pixels, which is the one cost of that choice: they
 * are approximate at extreme container widths. At the widths this renders at
 * they read correctly.
 */
