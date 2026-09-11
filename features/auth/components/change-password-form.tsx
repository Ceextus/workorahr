"use client";

import { AlertCircle, Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { useId, useState } from "react";

import { useChangePassword } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "h-12 w-full rounded-field border bg-surface-raised px-4 pr-12 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Password strength, the useful parts only
// ─────────────────────────────────────────────────────────────────────────────

export interface PasswordRule {
  label: string;
  passes: boolean;
}

/**
 * The rules the backend's seeded passwords imply — `Admin@123`,
 * `NewPassword@123`: a capital, a digit, a symbol, and some length.
 *
 * Exported because the reset-password form checks the same thing, and two
 * different definitions of "strong enough" on two screens of the same app is
 * how you get a password accepted in one place and rejected in the other.
 */
export function passwordRules(value: string): PasswordRule[] {
  return [
    { label: "At least 8 characters", passes: value.length >= 8 },
    { label: "An uppercase letter", passes: /[A-Z]/.test(value) },
    { label: "A lowercase letter", passes: /[a-z]/.test(value) },
    { label: "A number", passes: /\d/.test(value) },
    { label: "A symbol", passes: /[^A-Za-z0-9]/.test(value) },
  ];
}

export function PasswordChecklist({ value }: { value: string }) {
  const rules = passwordRules(value);

  return (
    <ul className="flex flex-col gap-1.5" aria-live="polite">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-2 text-body-sm transition-colors ${
            rule.passes ? "text-primary" : "text-text-subtle"
          }`}
        >
          <span
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-pill ${
              rule.passes ? "bg-primary text-white" : "bg-surface-sunk"
            }`}
          >
            {rule.passes ? <Check size={11} aria-hidden /> : null}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

/*
 * THE CHECKLIST IS SHOWN WHILE TYPING, NOT AFTER SUBMITTING.
 *
 * A password field that accepts what you type and then rejects it on submit —
 * with a message listing rules you have now forgotten, and a cleared field — is
 * one of the most annoying interactions on the web.
 *
 * Live rules cost nothing and remove the guessing. `aria-live="polite"` means a
 * screen reader announces each rule as it starts passing, rather than the
 * sighted-only experience of watching ticks appear.
 *
 * THE RULES ARE INFERRED, WHICH IS WORTH BEING HONEST ABOUT
 *
 * The docs never state the password policy. These five are reverse-engineered
 * from the seeded examples, so the backend may enforce something different —
 * stricter, looser, or a blocklist of common passwords this cannot know about.
 *
 * That is why they gate nothing. Every rule can be failing and the button still
 * submits; the checklist is advice, and the server is the authority. A
 * client-side rule that blocks submission is a rule that will eventually reject
 * a password the backend would have accepted.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · A password field that can be revealed
// ─────────────────────────────────────────────────────────────────────────────

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  showError,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete: string;
  placeholder?: string;
  error?: string;
  showError?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-md font-semibold text-text-strong">
        {label} <span className="text-error">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${fieldBase} ${
            showError && error ? "border-error" : "border-border-subtle"
          }`}
        />

        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-pill text-text-subtle transition-colors hover:text-text-strong"
        >
          {revealed ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>

      {showError && error ? (
        <p role="alert" className="flex items-center gap-1.5 text-body-sm text-error">
          <AlertCircle size={14} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/*
 * `autoComplete` IS A REQUIRED PROP, NOT AN OPTIONAL ONE.
 *
 * Password managers read it to decide what to offer and what to save. Get it
 * wrong and a manager offers the old password in the new-password box, or
 * silently saves the wrong value.
 *
 * The three values that matter here:
 *
 *   current-password   the one they already have
 *   new-password       on both the new field and its confirmation
 *   username           on the email field of a reset form, so the manager knows
 *                      which entry it is updating
 *
 * Making it required means nobody can add a fourth password field and forget.
 *
 * THE REVEAL TOGGLE IS A REAL BUTTON WITH `aria-pressed`
 *
 * Not an icon with an onClick. It is focusable, it announces its state, and it
 * is `type="button"` — without that, a button inside a form defaults to
 * `type="submit"` and clicking the eye would submit the form. That is a genuine
 * bug that survives testing, because it only bites when the field is filled in.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The form
// ─────────────────────────────────────────────────────────────────────────────

export function ChangePasswordForm() {
  const oldId = useId();
  const newId = useId();
  const confirmId = useId();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const change = useChangePassword();

  const errors = {
    oldPassword: oldPassword ? undefined : "Enter your current password.",
    newPassword: !newPassword
      ? "Choose a new password."
      : newPassword === oldPassword
        ? "The new password must be different from the current one."
        : undefined,
    confirmPassword:
      confirmPassword === newPassword ? undefined : "The two passwords do not match.",
  };
  const isValid =
    !errors.oldPassword && !errors.newPassword && !errors.confirmPassword;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    try {
      await change.mutateAsync({ oldPassword, newPassword });
      // Clear everything — leaving a password sitting in a form after it has
      // been submitted is needless exposure on a shared screen.
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTouched(false);
    } catch (cause) {
      console.error("[change password] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <section className="rounded-card bg-surface-raised p-6 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
          <KeyRound size={18} aria-hidden />
        </span>
        <div>
          <h2 className="text-body-lg font-bold text-text-strong">Change password</h2>
          <p className="text-body-sm text-text-muted">
            You need your current password to set a new one.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex max-w-md flex-col gap-5">
        <PasswordField
          id={oldId}
          label="Current password"
          value={oldPassword}
          onChange={setOldPassword}
          autoComplete="current-password"
          error={errors.oldPassword}
          showError={touched}
        />

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

        <button
          type="submit"
          disabled={change.isPending}
          className="h-12 w-full rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle sm:w-fit sm:px-8"
        >
          {change.isPending ? "Changing…" : "Change password"}
        </button>
      </form>
    </section>
  );
}

/*
 * THE CONFIRMATION FIELD IS CHECKED HERE AND NOWHERE ELSE.
 *
 * `confirmPassword` is never sent — POST /auth/change-password takes
 * `oldPassword` and `newPassword` only. It exists purely so a typo in a field
 * nobody can read does not lock someone out of their own account. That makes it
 * the one validation rule in this form that genuinely belongs on the client,
 * because the server has no way to check it.
 *
 * WHY THE FIELDS ARE CLEARED ON SUCCESS BUT NOT ON FAILURE
 *
 * On success there is nothing left to do with them, and a filled password form
 * left on screen is a small hazard on a shared machine.
 *
 * On failure they stay. The usual reason a change fails is a mistyped current
 * password, and clearing all three would make the user retype a new password
 * they had already got right — which is the behaviour that makes people pick
 * something weaker on the second attempt.
 *
 * NO REDIRECT, AND NO LOGOUT
 *
 * The docs do not say whether changing a password invalidates existing sessions.
 * If it does, the next request 401s, the refresh in api-client fails, and the
 * user is bounced to login — which is correct behaviour arrived at without this
 * form having to guess. Logging them out pre-emptively would be wrong if the
 * backend keeps the session alive.
 */
