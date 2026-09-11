"use client";

import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { useForgotPassword } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const forgot = useForgotPassword();

  const error = !email.trim()
    ? "Enter your email address."
    : !email.includes("@")
      ? "That does not look like an email address."
      : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (error) return;

    try {
      await forgot.mutateAsync({ email: email.trim() });
    } catch (cause) {
      console.error("[forgot password] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Sent — the same screen regardless of whether the account exists
  // ───────────────────────────────────────────────────────────────────────────

  if (forgot.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-panel bg-primary/10 text-primary">
          <MailCheck size={26} aria-hidden />
        </span>

        <div>
          <h1 className="text-h4 text-text-strong">Check your email</h1>
          <p className="mt-2 text-body-md text-text-muted">
            If an account exists for{" "}
            <span className="font-semibold text-text-strong">{email.trim()}</span>,
            a six-digit code is on its way. It is only valid for a short time.
          </p>
        </div>

        <Link
          href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
        >
          Enter the code
        </Link>

        <button
          type="button"
          onClick={() => forgot.reset()}
          className="text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
        >
          Use a different email
        </button>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // The form
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h4 text-text-strong">Forgot your password?</h1>
        <p className="mt-2 text-body-md text-text-muted">
          Enter your email and we will send a code to reset it.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={emailId} className="text-body-md font-semibold text-text-strong">
            Email <span className="text-error">*</span>
          </label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoFocus
            placeholder="you@company.com"
            className={`h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              touched && error ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && error ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {error}
            </p>
          ) : null}
        </div>

        {forgot.isError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-field bg-error/8 p-3 text-body-sm font-medium text-error"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
            {forgot.error.message || "Could not send the code. Try again."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={forgot.isPending}
          className="h-12 w-full rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
        >
          {forgot.isPending ? "Sending…" : "Send reset code"}
        </button>
      </form>

      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-2 text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}

/*
 * "IF AN ACCOUNT EXISTS FOR…" IS DELIBERATE WORDING, NOT HEDGING.
 *
 * The obvious message is "We have sent a code to that address". It is friendlier
 * and it leaks: anyone can type addresses into this form and learn which ones
 * belong to real accounts, which is a list worth having if you are about to
 * attempt credential stuffing or phishing.
 *
 * The conditional phrasing means a successful response reveals nothing either
 * way. It only works if the backend also returns the same response for unknown
 * addresses — worth confirming, because if it 404s on an unknown email, this
 * careful wording is undone by the status code.
 *
 * WHY THE SUCCESS SCREEN REPLACES THE FORM ENTIRELY
 *
 * The alternative is a green message under a still-editable form, which leaves
 * "did that work? should I press it again?" unanswered and invites duplicate
 * codes — each one usually invalidating the last. A full state change makes the
 * next action unambiguous, and "Use a different email" is there for the typo
 * case rather than making them navigate away and back.
 *
 * THE EMAIL IS CARRIED TO THE NEXT SCREEN IN THE URL
 *
 * POST /auth/reset-password needs `email`, `token` and `newPassword` — so the
 * address has to be entered twice unless it is passed along. It is not secret,
 * and the alternative is asking someone to retype it while reading a code off
 * their phone.
 *
 * `autoComplete="username"` ON AN EMAIL FIELD
 *
 * Not a mistake. Password managers key their entries on the username field, and
 * this is how they know which account the reset that follows belongs to.
 */
