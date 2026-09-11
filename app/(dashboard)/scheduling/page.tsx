import type { Metadata } from "next";
import Link from "next/link";
import { Repeat } from "lucide-react";

import {
  OnDutyNow,
  RosterBoard,
} from "@/features/scheduling/components/roster-board";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Scheduling · Workora",
};

export default async function SchedulingPage() {
  const user = await getSession();
  const canManage = isManager(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h4 text-text-strong sm:text-h3">Scheduling</h1>
          <p className="mt-1 text-body-lg text-text-muted">
            Shifts, rotas and who is working when.
          </p>
        </div>

        <Link
          href="/scheduling/swap-requests"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-field border border-border-strong px-5 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
        >
          <Repeat size={16} aria-hidden />
          Swap requests
        </Link>
      </header>

      <OnDutyNow />

      <RosterBoard canManage={canManage} />
    </div>
  );
}

/*
 * Everyone can read the rota — you cannot work a shift you cannot see. Creating
 * shift templates and assigning people is gated at MANAGER.
 *
 * The docs annotate none of the scheduling endpoints, so that split is this
 * app's policy. It mirrors leaves, where a manager approves and an employee
 * only sees their own.
 */
