import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Building a client
// ─────────────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /*
         * Data is considered fresh for a minute, so a refetch is not fired the
         * instant a component mounts.
         *
         * This is not a performance tweak — with the default of 0, anything
         * rendered on the server is stale by the time it reaches the browser,
         * so the client immediately refetches everything the server just sent.
         * You would pay for the data twice and see a flash as it swaps.
         */
        staleTime: 60 * 1000,

        /*
         * A 401 or 403 will never succeed on retry — the session is gone or the
         * rank is too low. Retrying three times just delays the redirect and
         * triples the load on a backend that already said no.
         */
        retry: (failureCount, error) => {
          const status = (error as { status?: number })?.status;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 2;
        },
      },
      dehydrate: {
        /*
         * Lets a query that is still in flight on the server travel to the
         * browser, so the client picks up the pending promise instead of
         * starting the same request again.
         */
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

/*
 * Why the retry predicate reads `error.status` and not `error instanceof
 * ApiError`: this file is imported by both runtimes, and keeping it free of
 * project imports avoids dragging api-client into places that do not need it.
 * The shape check is enough — ApiError carries `status`, and anything else
 * simply falls through to the default.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · One per request on the server, one per tab in the browser
// ─────────────────────────────────────────────────────────────────────────────

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // A fresh client for every request. See below — this is the whole point.
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

/*
 * THE BUG THIS FILE EXISTS TO PREVENT
 *
 * The obvious version of this file is one line:
 *
 *   export const queryClient = new QueryClient()   // do not do this
 *
 * In the browser that is correct — one tab, one user, one cache.
 *
 * On the server it is a data leak. A Node process handles every visitor, and a
 * module-level value is created once and shared by all of them. So the cache
 * that holds one employee's payslips under the key ['payroll','me'] is the same
 * cache the next request reads from. Two people, one cache, and whoever asked
 * first decides what the second one sees.
 *
 * It would not look like a bug in development, where you are the only visitor.
 * It would look like a bug in production, intermittently, as a wrong name in a
 * header — the kind of thing that is nearly impossible to reproduce.
 *
 * Hence the split:
 *
 *   server    a new client per request, discarded when the response is sent.
 *             Nothing outlives the request, so nothing can leak between users.
 *
 *   browser   a lazily created singleton. One user, one tab — sharing is the
 *             entire point, since it is what makes navigating back to a list
 *             instant instead of a fresh fetch.
 *
 * This is the same reasoning as `cache()` in lib/auth.ts: request-scoped, never
 * process-scoped. It comes up whenever server code holds state.
 *
 * WHY LAZY RATHER THAN EAGER IN THE BROWSER
 *
 * `browserQueryClient` starts undefined and is filled on first call, rather than
 * being built when the module loads. During the initial render React may suspend
 * before the provider commits; a client created at module scope would be
 * discarded along with that render, and the replacement would start empty. The
 * lazy check survives it.
 *
 * `isServer` comes from TanStack rather than a hand-rolled `typeof window`
 * check, so it agrees with how the library itself decides.
 */
