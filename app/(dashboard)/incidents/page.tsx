import type { Metadata } from "next";
import Link from "next/link";
import { PhoneCall } from "lucide-react";

import { CurrentOnCall } from "@/features/incidents/components/on-call-roster";
import { IncidentBoard } from "@/features/incidents/components/incident-board";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Incidents · Workora",
};

export default async function IncidentsPage() {
  const user = await getSession();
  const canManage = isManager(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h4 text-text-strong sm:text-h3">Incidents</h1>
          <p className="mt-1 text-body-lg text-text-muted">
            Report and track what has gone wrong.
          </p>
        </div>

        <Link
          href="/incidents/on-call"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-field border border-border-strong px-5 text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
        >
          <PhoneCall size={16} aria-hidden />
          On-call rota
        </Link>
      </header>

      <CurrentOnCall />

      <IncidentBoard canManage={canManage} />
    </div>
  );
}

/*
 * REPORTING IS OPEN TO EVERYONE; MANAGING IS NOT.
 *
 * POST /incidents carries no documented role restriction, and that is the right
 * default — the person who notices the outage is rarely the person who owns it,
 * and a permission wall on reporting means incidents go unreported.
 *
 * Acknowledge, resolve and close are gated at MANAGER via `canManage`. The docs
 * do not annotate those either, so this is the frontend being conservative
 * rather than mirroring a documented rule. If the backend turns out to allow
 * any employee to resolve, loosen it here — the gate is courtesy, and the
 * server is the one that decides.
 *
 * WHY "CURRENT ON-CALL" IS ON THIS PAGE AND NOT ONLY THE ROTA PAGE
 *
 * It is the first question anyone asks when something breaks, and making them
 * navigate to a second screen to answer it defeats the purpose. The rota page
 * has the full schedule; this page has the one line that matters right now.
 */
