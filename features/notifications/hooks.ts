"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as notificationsApi from "./api";
import { isUnread, type Notification } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Keys
// ─────────────────────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

/*
 * `unreadCount()` produces exactly ["notifications", "unread-count"] — the same
 * array the topbar has been writing inline since Phase 04, when this file did
 * not exist yet.
 *
 * That is not a coincidence, it is the migration. Had the factory produced
 * ["notifications", "unreadCount"] instead, the topbar's badge and this file's
 * invalidations would address two different cache entries: marking everything
 * read would empty the list and leave the red dot sitting there. Matching the
 * existing literal exactly means the topbar can switch to `useUnreadCount()`
 * with no behaviour change at all.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Reads
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: notificationsApi.getMyNotifications,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 30 * 1000,
  });
}

/*
 * TWO QUERIES FOR WHAT LOOKS LIKE ONE PIECE OF DATA
 *
 * The count is derivable from the list — `list.filter(isUnread).length` — so a
 * second endpoint looks redundant. It is not, because of who calls it.
 *
 * The topbar renders on every single page and only ever needs a number. If it
 * derived that from the list, every page in the app would download every
 * notification the user has ever received to display "3". GET
 * /notifications/unread-count returns a bare integer instead.
 *
 * The cost is that two cache entries now describe the same truth and can
 * disagree, which is exactly what the optimistic updates in Block 3 are
 * carefully keeping in step.
 *
 * `staleTime: 30s` on the count and none on the list: the badge is glanceable
 * and can lag half a minute, but a list someone deliberately opened should be
 * current.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Writes, optimistically
// ─────────────────────────────────────────────────────────────────────────────

/** What onMutate hands to onError so a failure can be rolled back. */
interface Snapshot {
  list: Notification[] | undefined;
  count: number | undefined;
}

/**
 * Both spellings at once, so `isUnread` agrees with the optimistic row no
 * matter which field the backend turns out to send. The cast is because `read`
 * is not on the documented interface — that is the whole point of writing it.
 */
function asRead(item: Notification): Notification {
  return { ...item, unread: false, read: true } as Notification;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAsRead,

    onMutate: async (id: string): Promise<Snapshot> => {
      // Stop any in-flight refetch from landing after this and overwriting it.
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const list = queryClient.getQueryData<Notification[]>(notificationKeys.list());
      const count = queryClient.getQueryData<number>(notificationKeys.unreadCount());

      // Only decrement if this one was actually unread — clicking an already
      // read notification must not drive the badge below zero.
      const target = list?.find((item) => item.id === id);
      const wasUnread = target ? isUnread(target) : false;

      queryClient.setQueryData<Notification[]>(notificationKeys.list(), (current) =>
        current?.map((item) =>
          item.id === id ? asRead(item) : item,
        ),
      );

      if (wasUnread) {
        queryClient.setQueryData<number>(notificationKeys.unreadCount(), (current) =>
          Math.max(0, (current ?? 1) - 1),
        );
      }

      return { list, count };
    },

    onError: (error: Error, _id, snapshot) => {
      // Put both entries back exactly as they were.
      if (snapshot) {
        queryClient.setQueryData(notificationKeys.list(), snapshot.list);
        queryClient.setQueryData(notificationKeys.unreadCount(), snapshot.count);
      }
      toast.error(error.message || "Could not mark that as read");
    },

    // Success or failure, let the server settle the argument.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,

    onMutate: async (): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const list = queryClient.getQueryData<Notification[]>(notificationKeys.list());
      const count = queryClient.getQueryData<number>(notificationKeys.unreadCount());

      queryClient.setQueryData<Notification[]>(notificationKeys.list(), (current) =>
        current?.map(asRead),
      );
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);

      return { list, count };
    },

    onError: (error: Error, _void, snapshot) => {
      if (snapshot) {
        queryClient.setQueryData(notificationKeys.list(), snapshot.list);
        queryClient.setQueryData(notificationKeys.unreadCount(), snapshot.count);
      }
      toast.error(error.message || "Could not mark everything as read");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/*
 * THIS IS THE FIRST OPTIMISTIC MUTATION IN THE APP, AND IT IS THE RIGHT PLACE
 * FOR ONE.
 *
 * Everywhere else — creating an employee, approving leave, running payroll —
 * the pattern is `invalidate` and wait. That is correct there: those are
 * consequential writes, the server may reject them on rules the client does not
 * know, and a half-second of "Saving…" is honest.
 *
 * Marking a notification read is the opposite on every count. It cannot
 * meaningfully fail, the result is cosmetic, and the user is going to do it
 * repeatedly. Waiting for a round-trip before the row stops looking bold makes
 * the whole list feel broken.
 *
 * SO WHAT THE THREE CALLBACKS ACTUALLY DO
 *
 *   onMutate    runs BEFORE the request. Cancels in-flight refetches, snapshots
 *               both cache entries, writes the expected result immediately, and
 *               returns the snapshot.
 *   onError     receives that snapshot as its third argument and restores it.
 *   onSettled   invalidates either way, so the server has the last word.
 *
 * THE `cancelQueries` LINE IS NOT OPTIONAL
 *
 * Without it: a background refetch of the list is already in flight, you click,
 * the cache is optimistically updated, then that older response arrives and
 * overwrites it with pre-click data. The row silently goes bold again a second
 * later. `cancelQueries` discards those in-flight results first.
 *
 * WHY BOTH `unread: false` AND `read: true` ARE WRITTEN
 *
 * `isUnread` in types.ts reads whichever field the backend actually sends.
 * These optimistic entries have to satisfy it under either spelling, or the
 * optimistic row would still count as unread against the very helper the UI
 * filters with. Writing both costs nothing and is correct either way.
 *
 * `(current ?? 1) - 1` RATHER THAN `(current ?? 0) - 1`
 *
 * If the count has not loaded yet but a row is visibly unread, the truth is at
 * least 1. Starting from 0 would clamp to 0 and then the invalidation would pop
 * the badge back — a visible flicker. Starting from 1 lands on 0, which is
 * what the refetch is about to confirm.
 */
