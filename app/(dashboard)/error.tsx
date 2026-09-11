"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="grid place-items-center py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-card bg-surface-raised p-8 text-center shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-field bg-error/10 text-error">
          <TriangleAlert size={22} aria-hidden />
        </span>

        <div>
          <h2 className="text-h5 text-text-strong">This page didn’t load</h2>
          <p className="mt-2 text-body-md text-text-muted">
            Everything else still works — you can keep using the sidebar.
          </p>
        </div>

        {error.message ? (
          <p className="w-full break-words rounded-field bg-surface-sunk px-4 py-3 text-body-sm text-text-muted">
            {error.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={retry}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
        >
          <RefreshCw size={16} aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}

/*
 * The second boundary, and it does a different job from app/error.tsx.
 *
 * This one sits *inside* the dashboard layout, so it catches failures in the
 * page while the sidebar and topbar stay mounted and usable. One broken screen
 * does not take the whole app down with it — you can navigate away.
 *
 * app/error.tsx is the outer net: it catches the layout itself failing, which
 * means there is no shell left to preserve and the whole viewport is replaced.
 *
 * Two boundaries, two blast radii. That is the point of them being nestable.
 */
