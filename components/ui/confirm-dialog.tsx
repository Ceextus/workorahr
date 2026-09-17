"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  /** Dismiss without acting — backdrop, Escape, or Cancel. */
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  /** What will happen, in a sentence. Shown under the title. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` paints the confirm button red. Use it for anything destructive. */
  tone?: "danger" | "default";
  /** Disables both buttons and relabels confirm while the request is in flight. */
  isPending?: boolean;
  pendingLabel?: string;
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isPending = false,
  pendingLabel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  /*
   * `onCancel` is held in a ref so the effects below can call the latest version
   * without listing it as a dependency. Depending on it directly re-runs the
   * effect on every render — which is what stole focus on every keystroke in the
   * drawer before it was fixed the same way.
   */
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  // Escape dismisses, and the page behind must not scroll while this is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /*
   * Focus lands on CANCEL, not confirm.
   *
   * A destructive dialog that opens with the destructive button focused turns a
   * stray Enter or Space — very likely, since one just activated the button that
   * opened this — into the thing it was meant to prevent.
   */
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-error text-white hover:bg-error/90"
      : "bg-grey-900 text-white hover:bg-grey-800";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={cancelLabel}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-grey-900/40 backdrop-blur-[2px]"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="safe-bottom relative w-full max-w-md rounded-t-panel bg-surface-raised p-6 shadow-float sm:rounded-panel"
      >
        <div className="flex gap-4">
          {tone === "danger" ? (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-error/12 text-error">
              <AlertTriangle size={20} aria-hidden />
            </span>
          ) : null}

          <div className="min-w-0">
            <h2 id={titleId} className="text-body-lg font-bold text-text-strong">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1.5 break-words text-body-md text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-12 flex-1 rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`h-12 flex-1 rounded-field text-body-md font-semibold transition-colors disabled:bg-grey-300 disabled:text-text-subtle ${confirmClass}`}
          >
            {isPending ? (pendingLabel ?? "Working…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * THIS REPLACES `window.confirm()`, WHICH FIVE SCREENS WERE USING.
 *
 * The native dialog was always a placeholder — two files said so in comments.
 * What was wrong with it:
 *
 *   It cannot be styled or themed, so it appears as a grey OS box in the middle
 *   of a designed product, and in dark mode it is jarringly light.
 *
 *   It says the site's hostname above the message. "localhost:3000 says:" is not
 *   something to ship.
 *
 *   It blocks the main thread. Nothing renders, no animation runs, and on mobile
 *   some browsers suppress it entirely after repeated use — so a delete button
 *   silently starts doing nothing.
 *
 *   It cannot show pending state, so the moment after confirming is unexplained.
 *
 * `role="alertdialog"` RATHER THAN `role="dialog"`
 *
 * It is the specific role for a modal that interrupts to confirm a consequence.
 * Screen readers announce the title and description immediately on open, which
 * is what makes the warning arrive before the buttons do.
 *
 * IT SLIDES UP FROM THE BOTTOM ON A PHONE
 *
 * `items-end` until `sm`, then centred. A dialog pinned to the bottom edge puts
 * its buttons under the thumb rather than in the middle of the screen, and
 * `safe-bottom` keeps them clear of the home indicator — this app is heading
 * into a WebView.
 *
 * `flex-col-reverse` on the button row means Confirm renders ABOVE Cancel when
 * stacked on a narrow screen, while staying to the RIGHT of it on a wide one.
 * Both are the conventional position for the primary action in their layout.
 */
