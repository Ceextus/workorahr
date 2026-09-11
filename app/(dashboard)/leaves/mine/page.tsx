import type { Metadata } from "next";

import { MyLeaves } from "@/features/leaves/components/my-leaves";

export const metadata: Metadata = {
  title: "My leave · Workora",
};

export default function MyLeavesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">My leave</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Request time off and track where each request stands.
        </p>
      </header>

      <MyLeaves />
    </div>
  );
}

/*
 * No role gate. GET /leaves/me, POST /leaves and DELETE /leaves/{id} are all
 * open to any authenticated employee acting on their own requests.
 */
