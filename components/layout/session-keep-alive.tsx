"use client";

import { useEffect, useRef } from "react";

import { refreshSession } from "@/lib/api-client";

/** How often to rotate while the tab is open and visible. */
const INTERVAL_MS = 10 * 60 * 1000;

/** On regaining focus, only refresh if it has been at least this long. */
const FOCUS_THRESHOLD_MS = 5 * 60 * 1000;

export function SessionKeepAlive() {
  // Initialised to 0 rather than Date.now(): reading the clock during render is
  // impure and the React Compiler rejects it. The effect sets the real value on
  // mount, which is the same moment in practice.
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    lastRefreshAt.current = Date.now();

    async function refresh() {
      if (cancelled || document.visibilityState !== "visible") return;
      lastRefreshAt.current = Date.now();
      await refreshSession();
    }

    const timer = window.setInterval(refresh, INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      // A laptop that has been asleep wakes up here, possibly hours later.
      if (Date.now() - lastRefreshAt.current >= FOCUS_THRESHOLD_MS) {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}

/*
 * WHY THIS EXISTS WHEN api-client ALREADY REFRESHES ON 401.
 *
 * That interceptor fixes client requests: a query or mutation that hits an
 * expired token retries transparently. It cannot fix a *server render*.
 *
 * The dashboard layout calls `requireSession()` on the server, which calls
 * /auth/me with the cookies from the incoming request. If the access token has
 * expired, that fails and redirects to /login — before any client code runs, so
 * there is nothing for the interceptor to intercept. Someone who left a tab open
 * over lunch would click a link and land on the login screen with no
 * explanation.
 *
 * A Server Component cannot refresh its way out of that, because it cannot set
 * cookies. So the cookie has to already be valid when the request arrives, which
 * means keeping it fresh from the browser while the tab is open. That is this
 * component's whole job.
 *
 * THE VISIBILITY CHECK IS THE POINT, NOT AN OPTIMISATION
 *
 * A bare `setInterval` keeps firing in a background tab. Twenty tabs left open
 * overnight would each rotate the token every ten minutes until morning —
 * thousands of pointless requests, and on mobile, battery. Refreshing only while
 * visible means a hidden tab costs nothing, and the visibilitychange handler
 * catches it up the moment someone returns to it.
 *
 * `FOCUS_THRESHOLD_MS` STOPS THE OBVIOUS ABUSE
 *
 * Without it, alt-tabbing between two windows would fire a refresh on every
 * switch. Five minutes is long enough that ordinary window-flicking costs
 * nothing and short enough that a real return-from-lunch always refreshes.
 *
 * IT RENDERS `null`
 *
 * No markup, no wrapper element, no layout effect. It exists purely for the
 * effect, which is the honest shape for "run this behaviour somewhere in the
 * tree" — and it means it can be dropped into the layout without touching the
 * layout's own structure.
 *
 * WHAT THIS STILL DOES NOT COVER
 *
 * A cold navigation to the app after the access token has already expired — a
 * bookmark opened the next morning, with no tab having been left running. There
 * is no client to have kept anything alive, so `requireSession()` fails and the
 * redirect happens.
 *
 * The complete fix is refreshing in middleware, which CAN set cookies on the
 * response. It was not done here because middleware runs on the edge runtime
 * before every navigation, and adding a network call to the backend on each one
 * is a real latency cost to weigh. The `?next=` parameter already means that
 * logging in returns them to the page they wanted, so the failure mode is one
 * extra login rather than lost work.
 */
