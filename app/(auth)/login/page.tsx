import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login · Workora",
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Where to send them afterwards
// ─────────────────────────────────────────────────────────────────────────────

/** Only same-origin paths. See the note below on why this matters. */
function safeRedirectTarget(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  return <LoginForm next={safeRedirectTarget(params.next)} />;
}

/*
 * `searchParams` IS A PROMISE
 *
 * Another of the Next 16 async request APIs, alongside `cookies()` and `params`.
 * Reading `searchParams.next` without awaiting gives you `undefined`, and the
 * only symptom is that everyone lands on / after logging in instead of where
 * they were headed. No error, just a feature that quietly does not work.
 *
 * WHY `next` IS VALIDATED RATHER THAN USED DIRECTLY
 *
 * This value comes from the URL, so anyone can set it. Passed straight through,
 * this link is a working phishing tool:
 *
 *   /login?next=https://evil.example.com/
 *
 * The victim sees your real domain, your real login form, types a real password
 * — and gets handed to an attacker's page immediately afterwards, most likely a
 * convincing copy of your dashboard asking them to "log in again". The redirect
 * happening after a genuine login is exactly what makes it convincing.
 *
 * This is an open redirect, and it is one of the most common vulnerabilities in
 * otherwise careful login flows, because the parameter looks like plumbing
 * rather than input.
 *
 * Two rules close it:
 *
 *   startsWith("/")     rejects absolute URLs, so a full origin cannot be given.
 *   !startsWith("//")   rejects protocol-relative URLs. "//evil.example.com" has
 *                       no scheme, so it passes the first check while a browser
 *                       still resolves it to https://evil.example.com. This is
 *                       the case people miss.
 *
 * Anything failing either test falls back to "/". Rejecting rather than
 * sanitising is deliberate: there is no legitimate reason for an off-site value
 * here, so there is nothing worth salvaging.
 *
 * WHY THIS PAGE IS SO SMALL
 *
 * Everything interactive lives in LoginForm, which is a Client Component. This
 * file stays on the server so it can await searchParams — a Client Component
 * cannot — and hands the result down as a plain string.
 *
 * A useful default: keep the page a Server Component, and push the "use client"
 * boundary as deep as it will go.
 */
