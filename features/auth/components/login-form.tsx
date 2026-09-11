"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { useLogin } from "@/features/auth/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Icons
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Inline SVGs rather than an icon package, because the styleguide's icon set is
 * still unidentified. These three are the only ones this screen needs, they are
 * a few lines each, and swapping them for `lucide-react` later is a find and
 * replace. Adding a dependency to guess at the design would be the worse bet.
 *
 * `aria-hidden` on all of them: each sits beside text that already says what it
 * means, so announcing them again is noise for a screen reader.
 */

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg {...iconProps}>
    <path d="M10.6 6.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.7 3.6M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 4.1-.9" />
    <path d="m2 2 20 20" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · A field
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  invalid?: boolean;
  /** Rendered inside the field, on the right. */
  adornment?: React.ReactNode;
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid = false,
  adornment,
}: FieldProps) {
  // Stable across server and client render, and unique per instance.
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-md font-semibold text-text-strong">
        {label} <span className="text-error">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          className={`h-14 w-full rounded-field border bg-surface-raised px-4 pr-12 text-body-lg
            text-text-strong outline-none transition-colors
            placeholder:text-text-subtle
            focus:border-primary focus:ring-2 focus:ring-primary/20
            ${invalid ? "border-error" : "border-border-subtle"}`}
        />

        {adornment ? (
          <div className="absolute inset-y-0 right-4 flex items-center text-text-subtle">
            {adornment}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/*
 * WHY `useId` RATHER THAN label={name}
 *
 * A label needs `htmlFor` pointing at its input's id, or clicking the label does
 * nothing and screen readers cannot pair them. Hard-coding `id="email"` works
 * until the same component appears twice on a page and produces duplicate ids.
 * `useId` generates one that is unique per instance and identical on server and
 * client, so hydration does not complain.
 *
 * WHY THIS LIVES HERE AND NOT IN components/ui
 *
 * It has exactly one caller. Promote it to components/ui/text-field.tsx when the
 * third screen needs it — by then you will know which props it actually needs,
 * rather than guessing now and designing the wrong abstraction.
 *
 * `aria-invalid` is what tells assistive tech a field is wrong. The red border
 * carries that information for sighted users only, and a border colour is
 * invisible to a screen reader and to anyone who cannot distinguish it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The form
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = EMAIL_PATTERN.test(email);
  const canSubmit = emailValid && password.length > 0 && !login.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      await login.mutateAsync({ email, password });
      router.replace(next);
    } catch {
      // Nothing to do — `login.error` renders below. Swallowing here only stops
      // an unhandled rejection; the state is already captured by the mutation.
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-center text-h4 text-text-strong">
        Login first to your account
      </h2>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Input your registered email"
          autoComplete="email"
          invalid={Boolean(login.error)}
          adornment={
            emailValid ? (
              <span className="text-primary">
                <CheckIcon />
              </span>
            ) : null
          }
        />

        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Input your password account"
          autoComplete="current-password"
          invalid={Boolean(login.error)}
          adornment={
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="rounded-sm text-text-subtle transition-colors hover:text-text-strong
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />

        {login.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-body-sm font-medium text-error"
          >
            <span className="mt-0.5 shrink-0">
              <AlertIcon />
            </span>
            {login.error.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-body-md text-text-muted transition-colors hover:text-text-strong"
          >
            Forgot Password
          </Link>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-14 w-full rounded-field text-body-lg font-semibold transition-colors
            bg-grey-900 text-white hover:bg-grey-800
            disabled:cursor-not-allowed disabled:bg-grey-200 disabled:text-text-subtle
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grey-900"
        >
          {login.isPending ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}

/*
 * WHY THE FORM IS A CLIENT COMPONENT BUT THE PAGE IS NOT
 *
 * This needs useState for two inputs and a toggle, and useLogin for the
 * mutation — none of which exist on the server. The page that renders it stays a
 * Server Component and passes `next` down as a plain string prop.
 *
 * That split keeps the client bundle to what genuinely needs interactivity.
 *
 * WHY `mutateAsync` INSIDE try/catch RATHER THAN `mutate`
 *
 * `mutate` is fire-and-forget: it cannot be awaited, so there is no natural
 * place to put "navigate once this succeeded". `mutateAsync` returns a promise,
 * so the redirect sits on the line after the await and only runs on success.
 *
 * The cost is that a rejected promise must be caught or the browser logs an
 * unhandled rejection. The catch is empty on purpose — `useLogin` has already
 * recorded the failure, and `login.error` renders it above the button.
 *
 * WHY THE ERROR IS `login.error.message`
 *
 * That is the backend's own wording, carried through by ApiError from Block 3 of
 * api-client.ts — "Invalid email or password" rather than something invented
 * here. The user gets the real reason, and there is one fewer string to keep in
 * sync with the API.
 *
 * WHY `noValidate`
 *
 * It switches off the browser's native validation bubbles, which cannot be
 * styled and would appear alongside our own red messages. Validation still runs
 * — `canSubmit` handles it — it is just ours.
 *
 * WHY `disabled` RATHER THAN VALIDATING ON SUBMIT
 *
 * The mockup shows a greyed-out button until the form is usable, so the design
 * already decided. It also means the disabled state is doing real work rather
 * than being decorative: no request is sent that we already know will fail.
 */
