import { SessionKeepAlive } from "@/components/layout/session-keep-alive";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // The real gate. Middleware only checked that a cookie existed.
  const user = await requireSession();

  return (
    <div className="safe-x relative flex h-dvh overflow-hidden bg-surface lg:gap-4 lg:p-4">
      {/*
        A very faint brand wash in two corners. `fixed` + `-z-10` keeps it behind
        everything and out of the scroll, and `pointer-events-none` keeps it from
        swallowing clicks. Low enough opacity to read as tint, not decoration.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10
          bg-[radial-gradient(circle_at_12%_0%,rgba(39,163,118,0.10),transparent_45%),radial-gradient(circle_at_88%_8%,rgba(250,204,21,0.08),transparent_40%)]"
      />

      {/* Renders nothing; keeps the auth cookie fresh while this tab is open. */}
      <SessionKeepAlive />

      <Sidebar userType={user.userType} />

      {/*
        Horizontal padding is NOT on this column. It used to be, and every time
        the px-* value changed, main's vertical scrollbar visibly jumped left or
        right along with it — the scrollbar renders at main's own right edge,
        and that padding was what defined where main's edge sat.

        Instead this column stays full width, main's box goes flush to the true
        column edge (so its scrollbar has one stable home), and the horizontal
        inset moves inside Topbar and inside main, on wrappers that sit beside
        or below the scrollbar rather than around it.
      */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-4 sm:gap-4 lg:pt-0">
        <div className="px-5 sm:px-6 lg:px-4">
          <Topbar user={user} />
        </div>

        {/*
          `overflow-x-hidden` is not decoration — it is load-bearing.

          Setting only `overflow-y-auto` leaves `overflow-x` as `visible`, which
          CSS then computes to `auto`. So a single element a few pixels too wide
          anywhere on any page gives the whole content area a horizontal
          scrollbar. Declaring it explicitly means the page can never scroll
          sideways; anything that genuinely needs to scroll horizontally — a
          wide table — owns its own scroll container.
        */}
        <main className="scroll-area safe-bottom flex-1 overflow-y-auto overflow-x-hidden">
          {/*
            The padding lives HERE — inside the scroll container, wrapping the
            content — rather than on `main` itself. Padding on the scrollable
            element's own box would still move that box's edge and its
            scrollbar with it; padding on a child inside it only moves the
            content, never the scrollbar track beside it.
          */}
          <div className="px-5 pb-6 sm:px-6 lg:px-4">{children}</div>
        </main>
      </div>
    </div>
  );
}

/*
 * THIS IS WHERE AUTHENTICATION ACTUALLY HAPPENS.
 *
 * `requireSession()` calls /auth/me with the caller's cookies. A stale, forged
 * or expired token fails here and redirects to /login — the things middleware
 * could not detect, because a JWT is opaque to it.
 *
 * Putting it in the layout covers every page beneath it. Twenty-two routes are
 * protected by these two words, and a new page added tomorrow is protected the
 * moment it is created rather than when someone remembers to add a check.
 *
 * WHY THE SESSION IS FETCHED HERE AND PASSED DOWN
 *
 * Sidebar and Topbar both need the user, and both are Client Components. Each
 * could call `useCurrentUser()` — and each would then render a loading state on
 * every navigation for something the server already had in hand.
 *
 * Instead the server fetches once and passes plain props. `getSession` is
 * wrapped in React's `cache()`, so even if a page below also calls it, that is
 * still one request.
 *
 * WHY NO ROLE CHECK HERE
 *
 * Every authenticated employee is allowed into the dashboard. The few
 * rank-gated routes — /vendors, /leaves — call `requireRole` in their own page,
 * matching what ROUTE_MIN_ROLE declares in permissions.ts.
 *
 * `h-dvh` RATHER THAN `h-screen`, AND IT MATTERS ON A PHONE
 *
 * `h-screen` is 100vh, which on mobile browsers means the viewport WITHOUT the
 * address bar — so the page is taller than the visible area and the bottom is
 * cut off until you scroll. `dvh` is the dynamic viewport height: it tracks the
 * bar showing and hiding.
 *
 * `safe-x` on the shell keeps content clear of a notch. `safe-bottom` on <main>
 * keeps the last thing scrolled to clear of the home indicator — it sits on the
 * scroll container itself rather than the inner padding div, so it adds space
 * you can scroll to rather than a gap baked into every page's content height.
 *
 * The shell holds the height while only <main> scrolls, so the sidebar and
 * topbar stay put.
 */
