import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password · Workora",
};

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  // `searchParams` is a Promise in Next 16 — the same async request API as
  // `params` and `cookies()`. Without the await this is undefined and the email
  // field silently arrives empty.
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  return <ResetPasswordForm defaultEmail={email} />;
}

/*
 * THE EMAIL COMES IN THROUGH THE URL; THE TOKEN DOES NOT.
 *
 * /forgot-password links here with ?email=… so nobody has to retype an address
 * they just entered. That value is not secret and cannot be used on its own.
 *
 * The reset code is deliberately NOT accepted from the URL, even though the
 * backend emails it and a "click this link" flow would be more convenient. A
 * token in a query string ends up in browser history, in the Referer header of
 * anything the page loads, and in any analytics that record URLs — and this one
 * is enough to take over an account when paired with an email address that is
 * also in the URL.
 *
 * So the code is typed into a field and travels in the request body, which is
 * how features/auth/types.ts models it. One extra step, and the credential
 * never touches a URL.
 *
 * `typeof params.email === "string"` GUARDS A REAL CASE
 *
 * A repeated parameter — ?email=a&email=b — arrives as an array, and passing
 * that to a component expecting a string renders "a,b" into the field. The
 * check falls back to empty rather than to nonsense.
 */
