"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getQueryClient } from "@/lib/query-client";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The client boundary
// ─────────────────────────────────────────────────────────────────────────────

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/*
 * WHY THIS FILE EXISTS AT ALL
 *
 * `QueryClientProvider` uses React context, and context needs state, effects and
 * a component instance — none of which exist in a Server Component. So it has to
 * sit behind a "use client" boundary.
 *
 * app/layout.tsx stays a Server Component. It cannot carry "use client" itself:
 * that would opt the entire app into client rendering and cost you every benefit
 * of the App Router. Instead the layout renders this small client component and
 * passes the rest of the app through it as `children`.
 *
 * THE PART THAT SURPRISES PEOPLE
 *
 * Wrapping something in a Client Component does NOT make it a Client Component.
 *
 *   <QueryProvider>          <- client
 *     <DashboardLayout />    <- still a Server Component
 *   </QueryProvider>
 *
 * `children` is rendered by the server and passed down as an already-rendered
 * React node. QueryProvider never imports it, never calls it, and cannot see
 * inside it. Only an *import* from a "use client" file pulls a component into
 * the client bundle — nesting does not.
 *
 * This is the single most useful thing to understand about the App Router, and
 * it is why "just add a provider" does not quietly turn the app into an SPA.
 *
 * WHY `getQueryClient()` RATHER THAN `useState(() => new QueryClient())`
 *
 * You will find the useState form in older guides, and it does solve the same
 * problem — creating the client once instead of on every render. But it only
 * works from inside a component. `getQueryClient` is callable anywhere, which
 * matters later: prefetching in a Server Component needs the very same function,
 * and a useState-based client is unreachable from there.
 *
 * WHY NOT PASS `client={new QueryClient()}` INLINE
 *
 * A new cache on every render. Every query would refetch, every mutation would
 * lose its state, and the app would look like it was flickering rather than
 * failing. Worth knowing because it is a single plausible-looking character
 * different from the correct version.
 */
