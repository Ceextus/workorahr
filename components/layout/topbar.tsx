"use client";

import Link from "next/link";
import { Bell, LogOut } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useLogout } from "@/features/auth/hooks";
import { useMyProfile } from "@/features/employees/hooks";
import { useUnreadCount } from "@/features/notifications/hooks";
import type { AuthUser } from "@/features/auth/types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Unread badge
// ─────────────────────────────────────────────────────────────────────────────

function NotificationBell() {
  const { data: unread } = useUnreadCount();
  const count = unread ?? 0;

  return (
    <Link
      href="/notifications"
      className="relative grid h-11 w-11 place-items-center rounded-pill bg-surface-raised text-text-muted shadow-card transition-colors hover:text-text-strong"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
    >
      <Bell size={20} aria-hidden />
      {count > 0 ? (
        <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-pill bg-error px-1 text-[10px] font-bold leading-4 text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/*
 * The badge is the reason this bar is a Client Component: the count has to keep
 * up without a page reload, which means a query rather than a server render.
 *
 * `unread ?? 0` covers first render and failure alike. A missing count is not
 * worth an error state in a nav bar — the worst case is a bell with no badge,
 * and the notifications page will report the real problem if there is one.
 *
 * This used to write its query key inline as ["notifications","unread-count"],
 * because the notifications feature had no hooks.ts. It does now, and
 * `useUnreadCount()` addresses that same key through the factory — which is
 * what lets the notifications page decrement this badge optimistically when you
 * clear a row. An inline literal would have kept working and stopped updating.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The bar
// ─────────────────────────────────────────────────────────────────────────────

export function Topbar({ user }: { user: AuthUser }) {
  const logout = useLogout();
  // Shared with the settings page, so this is one request for the session.
  const { data: profile } = useMyProfile();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3">
      <MobileNav userType={user.userType} />

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />

        <div className="flex items-center gap-3 rounded-pill bg-surface-raised p-1.5 shadow-card sm:pr-4">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            src={profile?.profilePictureUrl}
            size={36}
          />
          <div className="hidden leading-tight sm:block">
            <p className="text-body-md font-semibold text-text-strong">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-body-xs text-text-muted">{user.userType}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Log out"
          className="grid h-11 w-11 place-items-center rounded-pill bg-surface-raised text-text-muted shadow-card transition-colors hover:text-error disabled:opacity-50"
        >
          <LogOut size={20} aria-hidden />
        </button>
      </div>
    </header>
  );
}

/*
 * THE AVATAR NEEDS A SECOND REQUEST, AND IT IS WORTH IT.
 *
 * /auth/me returns no picture — `profilePictureUrl` lives on the employee
 * record, not the auth user. So the name and role come from the `user` prop the
 * server already fetched, while the picture comes from `useMyProfile()`.
 *
 * That is one extra call, not one per page: TanStack caches it, and the settings
 * page shares the same query. Until it resolves, `Avatar` shows initials, so
 * there is no flash of an empty circle.
 *
 * The logout button is the payoff for Block 4 of features/auth/hooks.ts: one
 * `logout.mutate()` clears the query cache, clears the cookies via the backend,
 * and redirects. All the care about `onSettled` and `queryClient.clear()` is
 * already spent, so this is a single call.
 *
 * THE SEARCH BOX IS GONE, AND IT WAS THE LAST INVENTED CONTROL IN THE APP.
 *
 * It sat here for months as a styled `<input type="search">` that did nothing —
 * the design has one, the API has no search endpoint, so it accepted whatever
 * you typed and dropped it. The comment that used to be here argued it should
 * stay visible so it would not be forgotten.
 *
 * That argument was wrong in one specific way: an inert control is not a
 * placeholder, it is a false promise. Someone typing a colleague's name into it
 * and pressing Enter learns nothing except that the app is broken. The
 * placeholders on /assets and /incidents say "not built yet" out loud; this said
 * "search me" and lied.
 *
 * It comes back the day GET /search (or /employees?q=) is documented, and the
 * design file is where it is remembered from until then.
 */
