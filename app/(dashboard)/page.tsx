import type { Metadata } from "next";

import { AnnouncementFeed } from "@/features/announcements/components/announcement-feed";
import { PulseGrid } from "@/features/ops-pulse/components/pulse-grid";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard · Workora",
};

/** Rendered on the server, so it reflects the server's clock — see the note below. */
function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  // Free — the layout already fetched this, and getSession is request-cached.
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">
          {greeting(new Date().getHours())}, {user?.firstName}
        </h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Here is what needs your attention today.
        </p>
      </header>

      <PulseGrid />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AnnouncementFeed />
        </div>
      </div>
    </div>
  );
}

/*
 * ON THE GREETING
 *
 * "Good morning" is computed from the server's clock, not the reader's. Deployed
 * to a region in a different timezone, someone in Lagos gets "Good evening" over
 * lunch. Two ways to fix it, neither free:
 *
 *   - compute it client-side, which costs a hydration pass for one string, or
 *   - store the user's timezone and use it here.
 *
 * Fine while the backend and users share a region. Worth remembering before this
 * ships anywhere else, because it is the sort of thing that gets reported as
 * "the app thinks it's the wrong time" long after anyone remembers why.
 *
 * The second row is a 3-column grid holding one 2-column panel, which looks
 * lopsided until the next panel lands beside it — check-in/check-out is the
 * natural candidate, once the attendance feature exists in Phase 07.
 */

/*
 * WHY `getSession()` AGAIN, AFTER THE LAYOUT ALREADY CALLED IT
 *
 * Because it costs nothing. `getSession` is wrapped in React's `cache()`, so
 * within a single render the layout's call and this one produce one request to
 * /auth/me. The alternative — threading `user` down through props or context
 * just to print a first name — is more code for the same result.
 *
 * That is the practical value of `cache()`: components can each ask for what
 * they need instead of coordinating.
 *
 * `user?.firstName` is optional-chained because getSession's type allows null.
 * It cannot actually be null here — the layout's `requireSession()` would have
 * redirected first — but the compiler does not know that, and asserting with `!`
 * would be claiming knowledge the type system cannot check.
 *
 * WHY THE PAGE IS A SERVER COMPONENT BUT PulseGrid IS NOT
 *
 * The greeting is known at request time and never changes, so it renders on the
 * server with no loading state. The counts change while you watch them, so they
 * belong in a query. Same page, two different needs — and the boundary sits
 * exactly where the data stops being static.
 */
