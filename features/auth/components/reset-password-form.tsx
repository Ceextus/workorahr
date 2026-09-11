"use client";

import { AlertCircle, ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import {
  PasswordChecklist,
  PasswordField,
} from "@/features/auth/components/change-password-form";
import { useResetPassword } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";

export function ResetPasswordForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const emailId = useId();
  const tokenId = useId();
  const newId = useId();
  const confirmId = useId();

  const [email, setEmail] = useState(defaultEmail);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const reset = useResetPassword();

  const errors = {
    email: !email.trim()
      ? "Enter your email address."
      : !email.includes("@")
        ? "That does not look like an email address."
        : undefined,
    token: token.trim() ? undefined : "Enter the code from your email.",
    newPassword: newPassword ? undefined : "Choose a new password.",
    confirmPassword:
      confirmPassword === newPassword ? undefined : "The two passwords do not match.",
  };
  const isValid =
    !errors.email && !errors.token && !errors.newPassword && !errors.confirmPassword;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    try {
      await reset.mutateAsync({
        email: email.trim(),
        token: token.trim(),
        newPassword,
      });
    } catch (cause) {
      console.error("[reset password] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  if (reset.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-panel bg-primary/10 text-primary">
          <CircleCheck size={26} aria-hidden />
        </span>

        <div>
          <h1 className="text-h4 text-text-strong">Password changed</h1>
          <p className="mt-2 text-body-md text-text-muted">
            Sign in with your new password.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="h-12 w-full rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h4 text-text-strong">Choose a new password</h1>
        <p className="mt-2 text-body-md text-text-muted">
          Enter the code from your email and pick something new.
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
            placeholder="you@company.com"
            className={`h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              touched && errors.email ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.email ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={tokenId} className="text-body-md font-semibold text-text-strong">
            Reset code <span className="text-error">*</span>
          </label>
          <input
            id={tokenId}
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\s/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={12}
            className={`h-12 w-full rounded-field border bg-surface-raised px-4 text-body-lg tracking-[0.3em] text-text-strong outline-none transition-colors placeholder:tracking-normal placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              touched && errors.token ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.token ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.token}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <PasswordField
            id={newId}
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            error={errors.newPassword}
            showError={touched}
          />
          {newPassword ? <PasswordChecklist value={newPassword} /> : null}
        </div>

        <PasswordField
          id={confirmId}
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={errors.confirmPassword}
          showError={touched}
        />

        {reset.isError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-field bg-error/8 p-3 text-body-sm font-medium text-error"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
            {reset.error.message || "That code was not accepted. It may have expired."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={reset.isPending}
          className="h-12 w-full rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
        >
          {reset.isPending ? "Saving…" : "Set new password"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2">
        <Link
          href="/forgot-password"
          className="text-body-md font-semibold text-primary hover:underline"
        >
          Send a new code
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

/*
 * `autoComplete="one-time-code"` IS THE SINGLE MOST VALUABLE ATTRIBUTE ON THIS
 * SCREEN.
 *
 * On iOS and Android the keyboard offers the code straight from the SMS or mail
 * notification, so it can be filled with one tap instead of switching apps,
 * memorising six digits, and switching back. This app is heading into a React
 * Native WebView, where that matters even more.
 *
 * `inputMode="numeric"` brings up the number pad without making it
 * `type="number"` — which would add spinner arrows, allow "1e5", and strip
 * leading zeros from a code like 012345.
 *
 * WHITESPACE IS STRIPPED AS IT IS TYPED
 *
 * `value.replace(/\s/g, "")` on every change. Codes get copied out of emails
 * with a trailing space or pasted as "123 456", and a token rejected for
 * whitespace produces "invalid code" — which sends the user off to request
 * another one that will fail exactly the same way. Fixing it silently is the
 * right call because there is no case where a space in a code is meaningful.
 *
 * THE PASSWORD FIELD AND CHECKLIST ARE IMPORTED FROM change-password-form
 *
 * Not copied. Two screens set a password, and they must agree on what counts as
 * strong, on the reveal toggle behaviour, and on the autocomplete values — the
 * failure mode of duplicating them is a password accepted on one screen and
 * rejected on the other.
 *
 * The import direction is a little odd, pulling shared parts out of a sibling
 * component rather than a neutral file. It stays that way until a third screen
 * needs them; at that point they move to components/ui/. Extracting now would
 * mean a file with two importers and no clear owner.
 *
 * WHY THE SUCCESS STATE USES `router.replace` RATHER THAN A LINK
 *
 * `replace` drops this page from history, so Back does not return to a reset
 * form holding a token that has now been consumed and would fail if resubmitted.
 */
