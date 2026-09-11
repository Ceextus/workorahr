import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password · Workora",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

/*
 * THIS ROUTE WAS A BLANK WHITE SCREEN, AND IT WAS REACHABLE.
 *
 * login-form.tsx has always linked here — "Forgot password?" under the password
 * field — and the file was zero bytes, so clicking it rendered the auth shell
 * around nothing at all. Someone locked out of their account followed the one
 * link meant for them and landed on emptiness.
 *
 * It is listed in PUBLIC_ROUTES in middleware.ts, so it is reachable without a
 * session — which is the entire point, and worth checking whenever a new
 * unauthenticated page is added.
 *
 * No `searchParams` here, unlike /reset-password: there is nothing to carry in.
 */
