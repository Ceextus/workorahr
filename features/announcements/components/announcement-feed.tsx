"use client";

import { Megaphone, Pin } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useAnnouncements } from "@/features/announcements/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Relative time
// ─────────────────────────────────────────────────────────────────────────────

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
];

function relativeTime(iso: string) {
  const elapsed = new Date(iso).getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return formatter.format(Math.round(elapsed / ms), unit);
    }
  }

  return "just now";
}

/*
 * `Intl.RelativeTimeFormat` is built into the platform — no date library needed
 * for "3 days ago". Passing `undefined` as the locale uses the reader's own.
 *
 * `numeric: "auto"` is what produces "yesterday" instead of "1 day ago".
 *
 * This runs in a Client Component deliberately. Formatted on the server it would
 * be computed at request time and then sit there going stale, and the server's
 * locale is not the reader's.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The feed
// ─────────────────────────────────────────────────────────────────────────────

export function AnnouncementFeed() {
  const { data, isLoading, error } = useAnnouncements();

  // Pinned first, then newest — the backend does not guarantee an order.
  const announcements = [...(data ?? [])]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

  return (
    <section className="flex flex-col rounded-card bg-surface-raised p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h5 text-text-strong">Announcements</h2>
        <a
          href="/announcements"
          className="text-body-md font-semibold text-primary hover:underline"
        >
          View all
        </a>
      </div>

      <div className="mt-5 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-border-subtle">
            {/* Widths vary per row so it reads as prose, not a grid. */}
            {["40%", "55%", "34%"].map((titleWidth, row) => (
              <div key={row} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <Skeleton className="h-10 w-10 shrink-0" />
                <div className="flex flex-1 flex-col gap-2">
                  <SkeletonText width={titleWidth} />
                  <SkeletonText width="85%" className="h-3" />
                  <SkeletonText width="30%" className="h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-body-md text-text-muted">
            Could not load announcements. {error.message}
          </p>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <Megaphone size={20} aria-hidden />
            </span>
            <p className="text-body-md text-text-muted">Nothing announced yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                  {announcement.pinned ? (
                    <Pin size={18} aria-hidden />
                  ) : (
                    <Megaphone size={18} aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-body-md font-semibold text-text-strong">
                      {announcement.title}
                    </p>
                    <time
                      dateTime={announcement.createdAt}
                      className="shrink-0 text-body-sm text-text-subtle"
                    >
                      {relativeTime(announcement.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-body-md text-text-muted">
                    {announcement.body}
                  </p>
                  <p className="mt-1 text-body-sm text-text-subtle">
                    {announcement.createdBy}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/*
 * FOUR STATES, NOT ONE
 *
 * Loading, error, empty and populated are each rendered explicitly. The empty
 * state is the one usually skipped, and it is the one a brand-new install shows
 * on day one — a blank rectangle where content should be reads as broken.
 *
 * The skeleton mirrors the real row's shape: an avatar-sized square and two
 * lines of differing width. A spinner would tell you nothing about what is
 * coming, and the layout would jump when it did.
 *
 * WHY SORTING HAPPENS HERE
 *
 * The API documents `pinned` but promises no ordering, and an unpinned newer
 * item appearing above a pinned one would make the pin meaningless. Sorting on
 * a copy — `[...(data ?? [])]` — matters: `.sort()` mutates in place, and that
 * array belongs to the query cache. Mutating it would corrupt what every other
 * component reads.
 *
 * `divide-y` rather than a border on each row, so there is no doubled line
 * between items and no stray line after the last one.
 */
