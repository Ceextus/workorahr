import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  CurrentOnCall,
  OnCallRoster,
} from "@/features/incidents/components/on-call-roster";
import { getSession } from "@/lib/auth";
import { isManager } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "On-call · Workora",
};

export default async function OnCallPage() {
  const user = await getSession();
  const canManage = isManager(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/incidents"
          className="inline-flex w-fit items-center gap-2 text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to incidents
        </Link>

        <header className="mt-4">
          <h1 className="text-h4 text-text-strong sm:text-h3">On-call rota</h1>
          <p className="mt-1 text-body-lg text-text-muted">
            Who is responsible right now, and who is next.
          </p>
        </header>
      </div>

      <CurrentOnCall />

      <section className="flex flex-col gap-4 border-t border-border-subtle pt-6">
        <div>
          <h2 className="text-h5 text-text-strong">Upcoming</h2>
          <p className="mt-1 text-body-md text-text-muted">
            Everything GET /incidents/on-call returns, newest boundary first.
          </p>
        </div>
        <OnCallRoster canManage={canManage} />
      </section>
    </div>
  );
}

/*
 * A SUB-ROUTE RATHER THAN A TAB ON /incidents.
 *
 * The two screens answer different questions — "what is broken?" versus "who is
 * covering?" — and they are consulted by different people at different times.
 * A tab would make the rota invisible to anyone who did not think to look for
 * it, and this route already existed in the scaffold.
 *
 * It is reached from the header link on /incidents rather than from the
 * sidebar, which stays one entry per feature. Same reasoning as
 * /leaves/mine versus /leaves, inverted: those two earned separate sidebar
 * entries because both are daily destinations for different roles.
 */
