import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BoardChat } from "@/features/board/components/board-chat";

export const metadata: Metadata = {
  title: "Board chat · Workora",
};

export default function BoardChatPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/board"
          className="inline-flex w-fit items-center gap-2 text-body-md font-semibold text-text-muted transition-colors hover:text-text-strong"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to the board room
        </Link>

        <header className="mt-4">
          <h1 className="text-h4 text-text-strong sm:text-h3">Board chat</h1>
          <p className="mt-1 text-body-lg text-text-muted">
            Discussion between board members.
          </p>
        </header>
      </div>

      <BoardChat />
    </div>
  );
}

/*
 * Not async, and it needs no session: the membership check inside <BoardChat>
 * is the only gate that means anything here, and it runs on the client because
 * only the API can answer it. The dashboard layout has already established that
 * somebody is logged in.
 */
