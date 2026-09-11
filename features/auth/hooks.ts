"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import * as authApi from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Query keys
// ─────────────────────────────────────────────────────────────────────────────

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

/*
 * A query key is the cache's address. Get it wrong and two components either
 * share data they shouldn't, or refetch the same thing twice.
 *
 * Writing keys as string literals at each call site works right up until you
 * need to invalidate them. Then you are grepping for `["auth", "me"]` and
 * hoping you found every spelling. A key factory means there is one spelling.
 *
 * The `all` / specific split is what makes invalidation composable, because
 * TanStack matches keys by prefix:
 *
 *   invalidateQueries({ queryKey: authKeys.me() })   just the current user
 *   invalidateQueries({ queryKey: authKeys.all })    everything auth-related
 *
 * Every feature from here on gets one of these. In departments it will grow a
 * `detail(id)` member, and the same prefix rule will let one create invalidate
 * the whole list.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Reading the session
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.getCurrentUser,
    // A 401 here means "logged out", which is an answer, not a failure to retry.
    retry: false,
  });
}

/*
 * The client-side counterpart to `getSession()` in lib/auth.ts. Two ways to ask
 * the same question, because they run in different places:
 *
 *   Server Component   await getSession()      — no loading state, already there
 *   Client Component   useCurrentUser()        — has isLoading, refetches, caches
 *
 * Prefer the server one wherever you can. It renders with the answer already in
 * hand, so there is no spinner and no flash of a logged-out header. Reach for
 * this hook when a *client* component genuinely needs the user — a dropdown that
 * shows the current avatar, say.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Logging in
// ─────────────────────────────────────────────────────────────────────────────

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      // The response already contains the user — no need to refetch /auth/me.
      queryClient.setQueryData(authKeys.me(), user);
      toast.success("Welcome back!");
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to log in");
    },
  });
}

/*
 * `router.refresh()` IS THE WHOLE LESSON OF THIS PHASE.
 *
 * Login succeeds. The cookie is set. And the page still shows you as logged out.
 *
 * The reason: Server Components rendered *before* the cookie existed, and React
 * is holding that rendered output. Nothing about a client-side mutation tells
 * the server to think again. `router.refresh()` does exactly that — it re-runs
 * the Server Components for the current route, this time with the cookie
 * attached, and reconciles the new output into the existing tree.
 *
 * Crucially it is not a page reload. Client state survives, form inputs keep
 * their values, and there is no white flash. It re-runs the *server* half only.
 *
 * You will need this after every mutation that changes something a Server
 * Component read. Login and logout are the obvious ones; so is anything the
 * dashboard layout displays.
 *
 * `setQueryData` RATHER THAN `invalidateQueries`
 *
 * Invalidating would mark the cache stale and fire a fresh /auth/me. But the
 * login response *is* the user — the data is already in hand. Writing it
 * straight into the cache saves a round-trip and means no component ever renders
 * a loading state for something we already know.
 *
 * NOTE WHAT IS NOT HERE: NAVIGATION.
 *
 * No `router.push`. This hook handles data concerns — refresh the server tree,
 * seed the cache — and leaves routing to the page, which is the only thing that
 * knows about `?next=`. Bake a destination in here and the hook becomes unusable
 * anywhere else.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · Logging out
// ─────────────────────────────────────────────────────────────────────────────

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Must happen whether or not the request succeeded — see below.
      queryClient.clear();
      toast.success("Logged out");
      router.replace("/login");
      router.refresh();
    },
  });
}

/*
 * `queryClient.clear()` IS NOT OPTIONAL.
 *
 * Remember from lib/query-client.ts that the browser client is a singleton — one
 * cache for the whole tab, deliberately, because that is what makes navigation
 * feel instant.
 *
 * Which means it survives logout. Without `clear()`, everything the previous
 * user loaded is still sitting there: their payslips under ['payroll','me'],
 * their leave history, their name in the header. The next person to log in on
 * that machine gets a dashboard briefly painted with someone else's data before
 * the refetches land.
 *
 * That is the browser-side twin of the server-side leak query-client.ts was
 * written to prevent. Same failure, opposite runtime.
 *
 * WHY `onSettled` RATHER THAN `onSuccess`
 *
 * Because a failed logout must still log you out locally. If the network is down
 * or the backend 500s, `onSuccess` never fires and the user stays sitting in an
 * authenticated-looking UI having explicitly asked to leave. `onSettled` runs on
 * both paths.
 *
 * The cookies are cleared by the backend's own Set-Cookie on the logout
 * response, relayed by the proxy route. If that request failed, they are still
 * present — which is exactly what `clearAuthCookies()` in lib/auth.ts is for,
 * from a Server Action.
 *
 * `replace` RATHER THAN `push`
 *
 * `push` leaves the dashboard in history, so Back returns to a page that will
 * bounce them straight out again. `replace` drops it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · Password flows
// ─────────────────────────────────────────────────────────────────────────────

export const useForgotPassword = () =>
  useMutation({ mutationFn: authApi.forgotPassword });

export const useResetPassword = () =>
  useMutation({ mutationFn: authApi.resetPassword });

export const useChangePassword = () => {
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });
};

/*
 * No onSuccess on any of them. None changes anything a Server Component has
 * rendered, and none should navigate on its own — the pages decide that.
 *
 * Each returns the standard mutation object, which is everything a form needs:
 *
 *   mutate / mutateAsync   fire it
 *   isPending              disable the button
 *   error                  an ApiError, so error.message is the backend's own
 *                          wording rather than something invented here
 *   isSuccess              show the "check your email" state
 */
