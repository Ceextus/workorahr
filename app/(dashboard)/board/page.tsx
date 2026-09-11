import type { Metadata } from "next";

import { BoardRoom } from "@/features/board/components/board-room";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Board Room · Workora",
};

export default async function BoardPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Board Room</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          A private space for board members.
        </p>
      </header>

      <BoardRoom canAdmin={isAdmin(user?.userType)} />
    </div>
  );
}

/*
 * NO `requireRole` HERE, AND THAT IS THE POINT OF THIS PAGE.
 *
 * Every other gated route in this app can be decided on the server from
 * `userType` alone — /vendors calls `requireRole("HR")` and redirects before
 * rendering anything.
 *
 * Board access is not a rank. The docs say membership is a list, and an ADMIN
 * who was never added is refused like anyone else. `userType` cannot answer it;
 * only GET /board/membership/me can. So the gate is a client-side query inside
 * <BoardRoom>, and this page renders the shell for everybody.
 *
 * `canAdmin` is a separate question with a separate answer. Adding a member
 * requires ROLE_ADMIN per the docs — so a board member who is not an admin sees
 * the room and no "Add" button, and an admin who is not a member sees the
 * locked-out screen. The two conditions are genuinely independent, which is
 * unusual enough to be worth naming.
 */
