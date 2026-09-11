"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  /*
   * The message is only trustworthy in development. In production Next replaces
   * a server error's message with a generic string plus a `digest`, so nothing
   * internal leaks to the browser. Both are rendered when present, and neither
   * is relied on to decide what to say.
   */
  const unreachable = /unavailable|failed to respond|fetch failed/i.test(
    error.message ?? "",
  );

  return (
    <div className="safe-x grid min-h-dvh place-items-center bg-surface px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-card bg-surface-raised p-8 text-center shadow-card">
        <span className="grid h-14 w-14 place-items-center rounded-field bg-error/10 text-error">
          <ServerCrash size={26} aria-hidden />
        </span>

        <div>
          <h1 className="text-h5 text-text-strong">
            {unreachable ? "Can’t reach the server" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-body-md text-text-muted">
            {unreachable
              ? "The API isn’t responding. This is usually temporary — try again in a moment."
              : "An unexpected error stopped this page from loading."}
          </p>
        </div>

        {error.message ? (
          <p className="w-full break-words rounded-field bg-surface-sunk px-4 py-3 text-body-sm text-text-muted">
            {error.message}
            {error.digest ? (
              <span className="mt-1 block text-text-subtle">
                Reference: {error.digest}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
          >
            <RefreshCw size={16} aria-hidden />
            Try again
          </button>
          <Link
            href="/login"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

/*
 * WHY THIS FILE IS AT app/, NOT app/(dashboard)/
 *
 * An `error.js` wraps the pages and nested layouts *below* it — but explicitly
 * not the `layout.js` in its own segment.
 *
 * The error you hit was thrown by `requireSession()` inside
 * app/(dashboard)/layout.tsx. A boundary at app/(dashboard)/error.tsx sits
 * *inside* that layout and would never see it. This one is a level up, so the
 * dashboard layout is among the children it wraps.
 *
 * Worth knowing before you spend an afternoon wondering why an error boundary
 * is not catching anything.
 *
 * It still does not cover app/layout.tsx itself. That needs `global-error.tsx`,
 * which replaces the whole document — including your fonts and globals.css. Not
 * worth adding until the root layout does something that can actually fail.
 *
 * WHY `retry` AND NOT `reset`
 *
 * Next 16 offers both. `retry()` re-fetches and re-renders the boundary's
 * children — right for an outage, because the point is to ask the server again.
 * `reset()` only clears the error state without re-fetching, which would put you
 * straight back into the same failure.
 *
 * WHY "Back to login" IS HERE
 *
 * If the failure was auth-shaped rather than an outage, "Try again" loops. A
 * second way out costs one link and saves someone clearing cookies by hand.
 */
