"use client";

import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  audienceLabel,
  NewAnnouncementDrawer,
} from "@/features/announcements/components/new-announcement-drawer";
import {
  useAnnouncements,
  useDeleteAnnouncement,
} from "@/features/announcements/hooks";
import type { Announcement } from "@/features/announcements/types";
import { formatDateTime } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function CardSkeleton({ bodyWidth }: { bodyWidth: string }) {
  return (
    <article className="flex gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
      <Skeleton className="h-11 w-11 shrink-0" rounded="field" />
      <div className="flex flex-1 flex-col gap-2.5">
        <SkeletonText width="45%" className="h-4" />
        <SkeletonText width="100%" className="h-3" />
        <SkeletonText width={bodyWidth} className="h-3" />
        <SkeletonText width="30%" className="h-3" />
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · One announcement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Has this announcement's expiry passed?
 *
 * `Date.now()` is impure, so this cannot be inlined into the component body —
 * the React Compiler rejects it there, and rightly: a render that reads the
 * clock produces a different result each time from identical props, which is
 * exactly what its memoisation is allowed to assume cannot happen.
 *
 * Hoisting it to a module-level function is the same escape hatch
 * announcement-feed.tsx uses for `relativeTime`. The honest limitation is that
 * the value is computed at render and never re-computed: an announcement that
 * expires while the tab sits open keeps looking current until something else
 * causes a re-render. For a notice board that is fine. For a countdown it would
 * not be, and that would need a ticking `useEffect`.
 */
function hasExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return false;
  return at < Date.now();
}

function Card({
  announcement,
  canManage,
  onDelete,
  isDeleting,
}: {
  announcement: Announcement;
  canManage: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const expired = hasExpired(announcement.expiresAt);

  const audiences = announcement.targetAudiences ?? [];
  // Empty and ["ALL"] mean the same thing to the backend, so show one chip.
  const chips = audiences.length === 0 ? (["ALL"] as const) : audiences;

  return (
    <article
      className={`flex gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6 ${
        expired ? "opacity-60" : ""
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-field ${
          announcement.pinned
            ? "bg-secondary/20 text-grey-900"
            : "bg-primary/10 text-primary"
        }`}
      >
        {announcement.pinned ? (
          <Pin size={19} aria-hidden />
        ) : (
          <Megaphone size={19} aria-hidden />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-body-lg font-bold text-text-strong">
            {announcement.title}
          </h3>

          {canManage ? (
            <button
              type="button"
              onClick={() => onDelete(announcement.id)}
              disabled={isDeleting}
              aria-label={`Delete "${announcement.title}"`}
              className="grid h-11 w-11 shrink-0 -my-1.5 -mr-2 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
            >
              <Trash2 size={17} aria-hidden />
            </button>
          ) : null}
        </div>

        <p className="mt-1.5 whitespace-pre-line break-words text-body-md text-text-muted">
          {announcement.body}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {chips.map((audience) => (
            <span
              key={audience}
              className="rounded-pill bg-surface-sunk px-2.5 py-1 text-body-sm font-semibold text-text-muted"
            >
              {audienceLabel(audience)}
            </span>
          ))}
          {announcement.pinned ? (
            <span className="rounded-pill bg-secondary/20 px-2.5 py-1 text-body-sm font-semibold text-grey-900">
              Pinned
            </span>
          ) : null}
          {expired ? (
            <span className="rounded-pill bg-error/10 px-2.5 py-1 text-body-sm font-semibold text-error">
              Expired
            </span>
          ) : null}
        </div>

        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-text-subtle">
          <span>{announcement.createdBy}</span>
          <span aria-hidden>·</span>
          <time dateTime={announcement.createdAt}>
            {formatDateTime(announcement.createdAt) ?? "Unknown date"}
          </time>
          {announcement.expiresAt ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {expired ? "Expired" : "Expires"}{" "}
                {formatDateTime(announcement.expiresAt)}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}

/*
 * EXPIRY IS SHOWN, NOT ENFORCED, AND THAT IS DELIBERATE.
 *
 * The obvious move is to filter expired announcements out. This does not,
 * because GET /announcements is already scoped by the backend — if it is still
 * returning an expired item, that is the server's answer about what this user
 * should see, and silently hiding it would mean the page disagrees with the API
 * with no way to tell which is right.
 *
 * Dimming plus an "Expired" chip says the same thing honestly: still here, no
 * longer current. It also makes the case visible to whoever posted it, so they
 * can delete it — which is the actual remedy, since there is no PATCH endpoint
 * to extend one.
 *
 * `whitespace-pre-line` on the body preserves the paragraph breaks someone
 * typed into the textarea. Without it a carefully spaced notice collapses into
 * one wall of text. `pre-line` rather than `pre` so ordinary wrapping still
 * happens — `pre` would refuse to wrap and reintroduce horizontal scrolling.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The board
// ─────────────────────────────────────────────────────────────────────────────

export function AnnouncementBoard({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error } = useAnnouncements();
  const remove = useDeleteAnnouncement();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pinned first, then newest. The API promises no ordering, and `.sort()`
  // mutates — so this sorts a copy, never the cached array itself.
  const announcements = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load announcements.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto sm:w-fit"
        >
          <Plus size={16} aria-hidden />
          New announcement
        </button>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {["70%", "55%", "82%"].map((width, row) => (
            <CardSkeleton key={row} bodyWidth={width} />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <Megaphone size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">
              Nothing announced yet
            </p>
            <p className="mt-1 max-w-sm text-body-md text-text-muted">
              {canManage
                ? "Publish one and everyone in the chosen audiences will see it."
                : "Company-wide notices will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              announcement={announcement}
              canManage={canManage}
              onDelete={(id) => remove.mutate(id)}
              isDeleting={remove.isPending && remove.variables === announcement.id}
            />
          ))}
        </div>
      )}

      <NewAnnouncementDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

/*
 * `remove.variables === announcement.id` IS HOW ONE MUTATION SERVES MANY ROWS.
 *
 * There is a single `useDeleteAnnouncement()` here, not one per card, so
 * `remove.isPending` is true for the whole list while any delete is in flight —
 * every trash button would grey out at once.
 *
 * TanStack exposes `variables`: the argument the in-flight mutation was called
 * with. Comparing it to the row's id narrows the pending state to the row that
 * actually caused it.
 *
 * The alternative is a `useMutation` inside `Card`, which also works and gives
 * each row its own state — at the cost of one mutation observer per row, and a
 * subscription to the query client per row. For a page that may render fifty
 * notices, one shared mutation is the cheaper shape.
 *
 * NO CONFIRMATION DIALOG, AND THAT IS A GAP WORTH NAMING
 *
 * DELETE /announcements/{id} is permanent and there is no undo endpoint. This
 * fires on the first click. The rest of the app has the same shape, so adding a
 * confirm here alone would be inconsistent — but a shared confirm dialog is
 * genuinely missing from components/ui/, and this is the most destructive
 * single-click action in the app so far.
 */
