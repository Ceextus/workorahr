import type { Metadata } from "next";

import { VendorList } from "@/features/vendors/components/vendor-list";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vendors · Workora",
};

export default async function VendorsPage() {
  // Gated in the sidebar AND here. ROUTE_MIN_ROLE lists /vendors as HR, and a
  // sidebar that hides a link does nothing about someone typing the URL.
  await requireRole("HR");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Vendors</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Suppliers and the people to call at them.
        </p>
      </header>

      <VendorList />
    </div>
  );
}

/*
 * `requireRole("HR")` RATHER THAN `isHR(user?.userType)` AND A CONDITIONAL.
 *
 * Elsewhere — assets, expenses, incidents — the page renders for everyone and
 * hides the privileged half. That is right when there is a personal view worth
 * showing.
 *
 * Vendors has no personal half. An employee has no "my vendors", so a page that
 * rendered an empty shell for them would be worse than a redirect. `requireRole`
 * redirects, matching what ROUTE_MIN_ROLE already declares for this path in
 * lib/permissions.ts — the sidebar filter and this check read the same rule
 * from different ends.
 *
 * NOTE THE DOCS ARE SILENT ON THIS
 *
 * The Vendors section carries no permission annotation at all, unlike
 * "List Assets (HR/Admin)" or "All Leave Requests (Manager/HR/Admin)". So the
 * HR gate here is this app's own policy, not a documented rule, and the backend
 * may well allow any authenticated caller. Worth confirming — if vendors are
 * meant to be readable by everyone, this should become the two-tier shape and
 * only the write actions should be gated.
 */
