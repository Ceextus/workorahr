import type { Metadata } from "next";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { MyProfile } from "@/features/employees/components/my-profile";

export const metadata: Metadata = {
  title: "Settings · Workora",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Settings</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Your profile and your password.
        </p>
      </header>

      <MyProfile />

      <section className="border-t border-border-subtle pt-6">
        <ChangePasswordForm />
      </section>
    </div>
  );
}

/*
 * The sidebar has linked to /settings since Phase 04 and it was a 404 for most
 * of that time. It now holds the three things in this API that a person can
 * change about themselves, and nothing else:
 *
 *   GET  /employees/me                    read your own record
 *   POST /employees/me/profile-picture    change your picture
 *   POST /auth/change-password            change your password
 *
 * Everything else on an employee — job title, salary, department, roles — is
 * maintained by HR through /employees/{id}, so it is displayed read-only above
 * rather than pretended to be editable here.
 *
 * No role gate. All three endpoints are self-scoped, so every authenticated
 * employee has exactly one profile to manage and it is their own.
 */
