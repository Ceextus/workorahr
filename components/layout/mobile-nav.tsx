"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SidebarNav } from "@/components/layout/sidebar";

export function MobileNav({ userType }: { userType: string }) {
  const pathname = usePathname();

  /*
   * The drawer is open only while the route is the one it was opened on.
   *
   * Storing the pathname instead of a boolean means navigation closes it for
   * free — including a WebView back gesture, which changes the route with no
   * click to hook onto. Deriving it this way also avoids a setState-in-effect,
   * which React flags as a cascading render.
   */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  // Escape closes, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenedAt(pathname)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-surface-raised text-text-strong shadow-card lg:hidden"
      >
        <Menu size={20} aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenedAt(null)}
            className="absolute inset-0 cursor-default bg-grey-900/40 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="safe-top safe-bottom relative flex h-full w-[86%] max-w-xs flex-col bg-surface-raised shadow-float"
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-5">
              <span className="flex items-center gap-2">
                <span className="text-h5 font-extrabold text-primary">H</span>
                <span className="text-body-lg font-bold text-text-strong">Workora</span>
              </span>

              <button
                type="button"
                onClick={() => setOpenedAt(null)}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-field text-text-muted transition-colors hover:bg-surface-sunk hover:text-text-strong"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <SidebarNav userType={userType} onNavigate={() => setOpenedAt(null)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/*
 * WHY A DRAWER RATHER THAN A BOTTOM TAB BAR
 *
 * A tab bar is the more native-feeling pattern and it tops out at about five
 * destinations. This app has seventeen across six groups, so a tab bar would
 * either hide most of the app behind a "More" tab, or force the nav to be
 * reorganised around a constraint the desktop layout does not share.
 *
 * The drawer shows the same seventeen, in the same groups, with the same
 * role filtering — one nav model at every width.
 *
 * `w-[86%] max-w-xs` leaves a strip of the page visible at the edge, so it reads
 * as a panel over the content rather than a new screen, and gives a clear place
 * to tap to dismiss.
 *
 * WHY OPEN STATE IS A PATHNAME, NOT A BOOLEAN
 *
 * `open` is derived: `openedAt === pathname`. Navigate anywhere and the two stop
 * matching, so the drawer closes with no effect and no listener.
 *
 * That covers the case a click handler cannot — the WebView back gesture, which
 * changes the route without any click happening. A boolean plus an effect would
 * work too, but it is a cascading render for something the render can just
 * compute.
 *
 * `safe-top` / `safe-bottom` keep the logo out from under a notch and the last
 * nav item off the home indicator. Both resolve to zero on a device without
 * either, so they cost nothing elsewhere.
 */
