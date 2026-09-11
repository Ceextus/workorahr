"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Sticky action row at the bottom — Cancel / Create. */
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, description, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * `onClose` is held in a ref so the effects below can call the latest version
   * without listing it as a dependency. See the note at the bottom of the file —
   * depending on it directly is what caused inputs to lose focus on every
   * keystroke.
   */
  const onCloseRef = useRef(onClose);

  // Assigned in an effect, not during render — a ref is a mutable external
  // store, and writing it while rendering makes the render impure. This runs
  // after every render, so the listener below always calls the latest version.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape closes, and the page behind must not scroll while this is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Move focus in ONCE per opening — never on subsequent renders.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-grey-900/30 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col bg-surface-raised shadow-float outline-none"
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div>
            <h2 className="text-h5 text-text-strong">{title}</h2>
            {description ? (
              <p className="mt-1 text-body-md text-text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-field text-text-muted transition-colors hover:bg-surface-sunk hover:text-text-strong"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer ? (
          <footer className="flex gap-3 border-t border-border-subtle px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/*
 * THE BUG THIS FILE SHIPPED WITH, BECAUSE IT IS WORTH KNOWING
 *
 * The first version had one effect, with `[open, onClose]` as its dependencies,
 * that both attached the Escape listener AND called `panelRef.current.focus()`.
 *
 * `onClose` is an ordinary arrow function defined in the parent's body, so it
 * has a new identity on every parent render. Typing one character into a field
 * set state, which re-rendered the parent, which produced a new `onClose`, which
 * React saw as a changed dependency — so it tore the effect down, re-ran it, and
 * called `focus()` on the panel. The input lost focus after every keystroke.
 *
 * Two things fix it, and both are worth doing:
 *
 *   1. Split the effects. Focus belongs to "the drawer opened", not "something
 *      re-rendered", so it depends on `open` alone.
 *
 *   2. Hold `onClose` in a ref. The Escape listener always calls the latest
 *      version without the effect depending on its identity. That keeps the fix
 *      inside this component rather than requiring every caller to remember
 *      `useCallback` — a rule that will eventually be forgotten.
 *
 * The general lesson: a function in a dependency array is a re-render trigger
 * unless the parent memoised it. When an effect does something *observable* —
 * moving focus, scrolling, playing audio — that turns into a visible bug rather
 * than a wasted cycle.
 *
 * `if (!open) return null` AFTER THE HOOKS, NEVER BEFORE
 *
 * Hooks must run in the same order on every render. Returning early above
 * `useEffect` would skip it when closed and run it when open, which React
 * rejects outright. The guard has to sit between the hooks and the JSX.
 *
 * WHY body overflow IS SAVED AND RESTORED
 *
 * Setting it back to "" on close would clobber any overflow the page had set for
 * its own reasons. Capturing the previous value and restoring that is the
 * difference between a drawer that cleans up after itself and one that quietly
 * breaks a scroll container somewhere else.
 *
 * THE BACKDROP IS A <button>
 *
 * A div with onClick is invisible to a keyboard and to assistive tech. A button
 * is focusable and announces itself, so click-outside-to-close is not
 * mouse-only. `cursor-default` keeps it from looking like a link.
 *
 * WHAT THIS IS NOT
 *
 * A full focus trap. Tab can still reach the page behind. Proper trapping means
 * either `<dialog>` with showModal(), or a library — worth doing before this
 * ships, but it is a self-contained upgrade rather than something to bolt on
 * badly now. Escape, scroll-lock, initial focus and aria-modal cover most of it.
 */
