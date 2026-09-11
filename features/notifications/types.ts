export interface Notification {
  id: string;
  title: string;
  description: string;
  /** e.g. LEAVE, EXPENSE, INCIDENT */
  type: string;
  unread: boolean;
  createdAt: string;
}

/**
 * Is this notification still unread?
 *
 * Reads `unread` as documented, and falls back to `!read` when `unread` is
 * absent.
 */
export function isUnread(notification: Notification): boolean {
  if (typeof notification.unread === "boolean") return notification.unread;

  const loose = notification as unknown as Record<string, unknown>;
  if (typeof loose.read === "boolean") return !loose.read;

  // Neither field present: treat it as read rather than badging everything.
  return false;
}

/*
 * WHY A FUNCTION RATHER THAN JUST READING `.unread`
 *
 * `unread` and `read` are the two ways every API in the world spells this, and
 * they are exact opposites. If this backend ships `read: false` instead, every
 * `n.unread` in the app evaluates to `undefined` — falsy — so the list renders
 * as if everything had been read. No error, no empty state, no clue: the
 * feature just quietly does nothing.
 *
 * This project has already been caught by that class of drift more than once —
 * `roleIds` documented on employee create and rejected by the deployed build,
 * `/leaves/me` returning an object where an array was documented. One helper
 * called from three places is a cheap hedge against the same thing here.
 *
 * The final `return false` is the deliberate choice. Defaulting to "unread"
 * would be the optimistic read, and it would badge every notification forever
 * on a backend that spells the field a third way — a permanently wrong red dot
 * nobody can clear. Defaulting to "read" fails quiet instead of fails loud, and
 * for a badge that is the right direction.
 */

/** Icon/label grouping. `type` is a free string, so the fallback is load-bearing. */
export const NOTIFICATION_FILTERS = ["All", "Unread"] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];
