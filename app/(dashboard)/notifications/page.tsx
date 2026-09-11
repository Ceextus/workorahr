import type { Metadata } from "next";

import { NotificationList } from "@/features/notifications/components/notification-list";

export const metadata: Metadata = {
  title: "Notifications · Workora",
};

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Notifications</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Everything the system has flagged for you.
        </p>
      </header>

      <NotificationList />
    </div>
  );
}

/*
 * THE ONLY PAGE IN THE APP WITH NO PERMISSION CHECK AND NO `async`.
 *
 * Every other dashboard page starts `const user = await getSession()` to decide
 * what to render. This one has nothing to decide: GET /notifications is scoped
 * by the backend to the caller, so there is no "everyone else's notifications"
 * view to gate. A role check here would be theatre.
 *
 * With no session needed, the page does not need to be async at all, so it
 * renders as a static shell and the client fetches into it. The layout above
 * has already called `requireSession()`, so this is still behind auth.
 */
