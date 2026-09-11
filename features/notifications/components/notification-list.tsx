"use client";

import {
  Banknote,
  Bell,
  CalendarDays,
  CheckCheck,
  Clock,
  Megaphone,
  Receipt,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "@/features/notifications/hooks";
import {
  NOTIFICATION_FILTERS,
  isUnread,
  type Notification,
  type NotificationFilter,
} from "@/features/notifications/types";
import { formatDateTime } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Type → icon
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, LucideIcon> = {
  LEAVE: CalendarDays,
  EXPENSE: Receipt,
  INCIDENT: ShieldAlert,
  ATTENDANCE: Clock,
  PAYROLL: Banknote,
  ANNOUNCEMENT: Megaphone,
  EMPLOYEE: Users,
};

/** "LEAVE_REQUEST_APPROVED" → "Leave request approved" */
function labelFor(type: string | null | undefined): string {
  if (!type) return "Notification";
  const words = type.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/*
 * `type` IS DOCUMENTED AS A FREE STRING, SO NOTHING HERE MAY ASSUME A VALUE.
 *
 * The docs give three examples — LEAVE, EXPENSE, INCIDENT — and explicitly say
 * "e.g.". That is not an enum, and treating it as one is how you get a blank
 * square the first time the backend sends BOOKING.
 *
 * So the map is a convenience and `?? Bell` is the actual contract. Same for
 * `labelFor`: it formats whatever arrives rather than looking it up, which
 * means LEAVE_REQUEST_APPROVED renders as a readable label on the day it is
 * added, with no code change here.
 *
 * The alternative — a `Record<NotificationType, LucideIcon>` with a union type —
 * would look tidier and would be a lie, because TypeScript cannot check what a
 * server sends at runtime. It would compile perfectly and still render nothing.
 *
 * WHY THE LOOKUP IS INLINE IN `Row` AND NOT AN `iconFor(type)` HELPER
 *
 * It was a helper, and the React Compiler's `static-components` rule rejected
 * it: `const Icon = iconFor(...)` looks like a component being *constructed*
 * during render, which would remount the icon and discard its state on every
 * pass. The compiler cannot see that the function only ever returns one of
 * eight module-level constants.
 *
 * Reading `TYPE_ICONS[...]` directly is the same lookup with the indirection
 * removed, and the compiler can follow it. Not a style preference — the helper
 * version fails lint.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function RowSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <li className="flex gap-4 px-5 py-4 sm:px-6">
      <Skeleton className="h-10 w-10 shrink-0" rounded="field" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width={titleWidth} />
        <SkeletonText width="90%" className="h-3" />
        <SkeletonText width="25%" className="h-3" />
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · One row
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = TYPE_ICONS[notification.type?.toUpperCase() ?? ""] ?? Bell;
  const unread = isUnread(notification);

  return (
    <li
      className={`flex gap-4 px-5 py-4 transition-colors sm:px-6 ${
        unread ? "bg-primary/[0.04]" : ""
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-field ${
          unread ? "bg-primary/12 text-primary" : "bg-surface-sunk text-text-subtle"
        }`}
      >
        <Icon size={18} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`min-w-0 break-words text-body-md ${
              unread ? "font-bold text-text-strong" : "font-semibold text-text-muted"
            }`}
          >
            {notification.title}
          </p>

          {/* The dot is the affordance: it is both the unread marker and the
              button that clears it, so there is nothing extra to aim at. */}
          {unread ? (
            <button
              type="button"
              onClick={() => onRead(notification.id)}
              aria-label={`Mark "${notification.title}" as read`}
              className="grid h-11 w-11 shrink-0 -my-1.5 -mr-2 place-items-center rounded-pill text-primary transition-colors hover:bg-primary/10"
            >
              <span className="h-2.5 w-2.5 rounded-pill bg-primary" aria-hidden />
            </button>
          ) : null}
        </div>

        <p className="mt-0.5 break-words text-body-md text-text-muted">
          {notification.description}
        </p>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-text-subtle">
          <span className="font-semibold">{labelFor(notification.type)}</span>
          <span aria-hidden>·</span>
          <time dateTime={notification.createdAt}>
            {formatDateTime(notification.createdAt) ?? "Unknown time"}
          </time>
        </p>
      </div>
    </li>
  );
}

/*
 * THE UNREAD DOT IS A REAL <button>, AND THE ROW IS NOT.
 *
 * The obvious build is to make the whole row clickable and mark it read on
 * click. That breaks two ways: the row has no destination to go to (these
 * notifications carry no link field in the API), so a full-row click target
 * promises navigation that never happens; and a row-wide handler makes it
 * impossible to select the text of a notification without clearing it.
 *
 * An 11×11 (44px) button is the iOS minimum tap target — this app is heading
 * into a React Native WebView, where a 10px dot would be unhittable. The
 * negative margins let a 44px target sit inside a row that is visually tighter
 * than 44px, which is the standard way to have both.
 *
 * `break-words` on the title and description because neither has a documented
 * length limit. Without it a long unbroken string — a URL, an ID — pushes the
 * row wider than the viewport and reintroduces the horizontal scrollbar that
 * was fixed app-wide.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · The list
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationList() {
  const { data, isLoading, error } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const [filter, setFilter] = useState<NotificationFilter>("All");

  // Newest first — the API documents no ordering.
  const sorted = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  const unreadCount = useMemo(() => sorted.filter(isUnread).length, [sorted]);
  const rows = filter === "Unread" ? sorted.filter(isUnread) : sorted;

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load your notifications.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="flex gap-1 rounded-card bg-surface-raised p-1.5 shadow-card sm:w-fit"
        >
          {NOTIFICATION_FILTERS.map((candidate) => (
            <button
              key={candidate}
              role="tab"
              type="button"
              aria-selected={filter === candidate}
              onClick={() => setFilter(candidate)}
              className={`flex-1 rounded-field px-4 py-2.5 text-body-md font-semibold transition-colors sm:flex-none ${
                filter === candidate
                  ? "bg-grey-900 text-white"
                  : "text-text-muted hover:bg-surface-sunk hover:text-text-strong"
              }`}
            >
              {candidate}
              {candidate === "Unread" && unreadCount > 0 ? (
                <span className="ml-1.5 tabular-nums">({unreadCount})</span>
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => markAllAsRead.mutate()}
          disabled={unreadCount === 0 || markAllAsRead.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-field border border-border-strong px-5 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk disabled:opacity-40 disabled:hover:bg-transparent sm:ml-auto"
        >
          <CheckCheck size={16} aria-hidden />
          Mark all as read
        </button>
      </div>

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        {isLoading ? (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {["45%", "60%", "38%", "52%", "30%"].map((width, row) => (
              <RowSkeleton key={row} titleWidth={width} />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <Bell size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                {filter === "Unread" ? "Nothing unread" : "No notifications yet"}
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {filter === "Unread"
                  ? "You are all caught up."
                  : "Leave decisions, expense approvals and incident updates will appear here."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {rows.map((notification) => (
              <Row
                key={notification.id}
                notification={notification}
                onRead={(id) => markAsRead.mutate(id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/*
 * THE FILTER IS CLIENT-SIDE, AND THAT IS A DECISION RATHER THAN A SHORTCUT.
 *
 * There is no `GET /notifications?unread=true` in the docs — the only list
 * endpoint returns everything. So filtering has to happen somewhere, and here
 * it is instant and costs no request. If the backend adds a query parameter
 * later, `filter` becomes part of the query key and this line goes away.
 *
 * The count beside the "Unread" tab is derived from the list rather than read
 * from `useUnreadCount()`, on purpose. Two numbers describing the same thing on
 * one screen will eventually disagree by a second or two, and seeing "Unread
 * (3)" beside a badge showing 2 is worse than either number being slightly
 * stale. The topbar badge uses the cheap endpoint because it has no list; this
 * screen already has the list, so it counts what it is actually rendering.
 *
 * NO `isRefreshing` DIMMING HERE, UNLIKE THE EMPLOYEE TABLE
 *
 * Elsewhere a background refetch dims the table to signal "this is updating".
 * That works when the refetch is caused by something the user just did to the
 * filters. Here the refetch is caused by the optimistic mark-as-read, and
 * dimming the whole list every time someone clears one dot would flash the
 * screen constantly. The optimistic update IS the feedback.
 *
 * WHY SORTING IS IN A `useMemo` AND THE FILTER IS NOT
 *
 * `sort` allocates and compares dates on every row; `filter` is one cheap pass.
 * More importantly the sort copies — `[...(data ?? [])]` — because `.sort()`
 * mutates in place and that array belongs to the query cache. Sorting it
 * directly would reorder what every other component reads, including the
 * topbar. The same trap is documented in announcement-feed.tsx.
 */
