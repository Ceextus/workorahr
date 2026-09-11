"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Copyable value
// ─────────────────────────────────────────────────────────────────────────────

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access needs a secure context and can be refused outright.
      toast.error("Could not copy — select the text and copy it manually.");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-field bg-surface-raised p-3">
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-text-muted">{label}</p>
        <p className="break-all text-body-md font-semibold text-text-strong">{value}</p>
      </div>

      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-subtle transition-colors hover:bg-surface-sunk hover:text-text-strong"
      >
        {copied ? (
          <Check size={17} className="text-primary" aria-hidden />
        ) : (
          <Copy size={17} aria-hidden />
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The confirmation
// ─────────────────────────────────────────────────────────────────────────────

export function NewCredentials({ email }: { email: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-field bg-primary/8 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-primary/15 text-primary">
          <Check size={18} aria-hidden />
        </span>
        <div>
          <p className="text-body-md font-bold text-text-strong">Employee created</p>
          <p className="text-body-sm text-text-muted">
            Their login account was created at the same time.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-card bg-surface-sunk p-4">
        <p className="flex items-center gap-2 text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          <Mail size={14} aria-hidden />
          Sign-in details
        </p>

        <CopyRow label="Email" value={email} />

        <p className="text-body-sm text-text-muted">
          A temporary password has been emailed to this address. They can change
          it under Settings once they are signed in, and reset it from the sign-in
          page if the email does not arrive.
        </p>
      </div>
    </div>
  );
}

/*
 * THIS PANEL DELIBERATELY DOES NOT SHOW A PASSWORD.
 *
 * The backend generates one, bcrypt-hashes it into the User row, and sends the
 * plain text by email. It is never in the create response, and there is no
 * endpoint that returns it afterwards — so there is nothing here to display,
 * and a component that implied otherwise would be lying.
 *
 * An earlier version searched the response for a password under nine possible
 * field names, written while we believed the mail service was down and the
 * password was unrecoverable. It turned out the real fault was an SMTP
 * "Authentication failed" — wrong credentials, not an outage — so the password
 * was being generated and delivered correctly the moment those were fixed. That
 * search, and the backend change that would have populated it, are both gone.
 *
 * WHY THE DRAWER STILL STOPS HERE INSTEAD OF CLOSING
 *
 * It used to close on success and rely on a toast. This is better for the one
 * job that follows creating an employee: telling them it happened. The address
 * is shown and copyable — useful when it was typed a moment ago and needs
 * pasting into a message — and "Add another" makes onboarding a batch of people
 * one continuous action rather than reopening the drawer each time.
 *
 * If the email genuinely does not arrive, the recovery path is the reset flow
 * at /forgot-password, which is why that is mentioned rather than an
 * administrator being told to go and read a database.
 */
