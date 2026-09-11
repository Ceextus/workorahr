import type { Metadata } from "next";

import { AnnouncementBoard } from "@/features/announcements/components/announcement-board";
import { getSession } from "@/lib/auth";
import { isHR } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Announcements · Workora",
};

export default async function AnnouncementsPage() {
  const user = await getSession();
  const canManage = isHR(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Announcements</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          {canManage
            ? "Company notices, and the place to publish them."
            : "Company notices for you and your team."}
        </p>
      </header>

      <AnnouncementBoard canManage={canManage} />
    </div>
  );
}

/*
 * ONE GATE, NOT TWO.
 *
 * Reading is open to everyone — GET /announcements scopes itself to the
 * caller's audience group server-side, so there is no permission decision to
 * make about the list. Writing is HR+, which covers both POST and DELETE since
 * the docs mark them with the same [HR+] annotation.
 *
 * So a single `canManage` drives the "New announcement" button and the delete
 * buttons on every card. Splitting it into `canCreate` and `canDelete` would
 * imply the API distinguishes them, and it does not.
 *
 * The subheading changes with the role. Small thing, but "the place to publish
 * them" in front of someone with no publish button is a promise the page cannot
 * keep.
 */
