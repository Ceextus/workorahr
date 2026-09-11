import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SwapRequestQueue } from "@/features/scheduling/components/swap-requests";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Swap requests · Workora",
};

export default async function SwapRequestsPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/scheduling"
          className="inline-flex w-fit items-center gap-2 text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to scheduling
        </Link>

        <header className="mt-4">
          <h1 className="text-h4 text-text-strong sm:text-h3">Swap requests</h1>
          <p className="mt-1 text-body-lg text-text-muted">
            Shift swaps waiting on a decision.
          </p>
        </header>
      </div>

      <SwapRequestQueue canApprove={isManager(user?.userType)} />
    </div>
  );
}

/*
 * Anyone can request a swap; approving and rejecting are gated at MANAGER.
 *
 * The status filter defaults to PENDING rather than "any", because the reason
 * to open this page is almost always the decisions outstanding. Everything else
 * is history, and history is one dropdown away.
 */
