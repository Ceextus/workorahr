"use client";

import { Info, Lock, MessagesSquare } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useBoardChat, useBoardMembership } from "@/features/board/hooks";
import { messageText, messageTime } from "@/features/board/types";
import { formatDateTime } from "@/lib/format";

export function BoardChat() {
  const membership = useBoardMembership();
  const isMember = membership.isMember;

  const { data, isLoading, error } = useBoardChat({ enabled: isMember });

  if (membership.isLoading) {
    return (
      <div className="flex flex-col gap-3 rounded-card bg-surface-raised p-6 shadow-card">
        {["55%", "40%", "70%"].map((width, row) => (
          <div key={row} className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0" rounded="pill" />
            <div className="flex flex-1 flex-col gap-1.5">
              <SkeletonText width="25%" className="h-3" />
              <SkeletonText width={width} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
        <span className="grid h-14 w-14 place-items-center rounded-panel bg-surface-sunk text-text-subtle">
          <Lock size={26} aria-hidden />
        </span>
        <div className="max-w-md">
          <p className="text-body-lg font-semibold text-text-strong">
            You are not a board member
          </p>
          <p className="mt-1.5 text-body-md text-text-muted">
            Board chat is restricted to people on the membership list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        Said up front rather than discovered by looking for a message box that
        is not there.
      */}
      <p className="flex items-start gap-2.5 rounded-card bg-surface-sunk p-4 text-body-md text-text-muted">
        <Info size={17} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <strong className="text-text-strong">Read-only.</strong> Messages are
          sent over the <code className="text-body-sm">/ws/board</code> WebSocket,
          which this app does not connect to yet — so history appears here but
          there is nowhere to type. The list refreshes every 30 seconds.
        </span>
      </p>

      {error ? (
        <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
          <p className="text-body-lg font-semibold text-error">
            Could not load the chat history.
          </p>
          <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
          {["60%", "35%", "72%", "48%"].map((width, row) => (
            <div key={row} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0" rounded="pill" />
              <div className="flex flex-1 flex-col gap-1.5">
                <SkeletonText width="22%" className="h-3" />
                <SkeletonText width={width} />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <MessagesSquare size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">
              Nothing said yet
            </p>
            <p className="mt-1 max-w-sm text-body-md text-text-muted">
              Board discussion will appear here once someone posts over the
              WebSocket.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4 rounded-card bg-surface-raised p-5 shadow-card sm:p-6">
          {data.map((message) => {
            const who = message.userName ?? message.userId?.slice(0, 8) ?? "Someone";
            const when = messageTime(message);

            return (
              <li key={message.id} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-primary/10 text-body-sm font-bold text-primary">
                  {who.slice(0, 2).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="break-all text-body-md font-semibold text-text-strong">
                      {who}
                    </span>
                    {when ? (
                      <time dateTime={when} className="text-body-sm text-text-subtle">
                        {formatDateTime(when)}
                      </time>
                    ) : null}
                  </p>
                  <p className="whitespace-pre-line break-words text-body-md text-text-muted">
                    {messageText(message) || "—"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/*
 * THE MISSING HALF IS STATED IN THE UI, NOT JUST IN A CODE COMMENT.
 *
 * A chat screen with no message box looks broken. Someone will assume the input
 * failed to render, refresh, and try again. The banner turns a bug report into
 * a known limitation, which is the difference between an unfinished feature and
 * a mysterious one.
 *
 * WHAT IT WOULD TAKE TO FINISH IT
 *
 * A WebSocket to /ws/board. The obstacle is authentication: the access token is
 * in an HttpOnly cookie, so JavaScript cannot read it to pass as a query
 * parameter, and the browser WebSocket API cannot set an Authorization header.
 *
 * A same-origin `ws://` URL would carry the cookie automatically — which is
 * what the /api proxy route achieves for ordinary requests — but that route
 * handler does not proxy the HTTP upgrade a WebSocket needs. Next route
 * handlers cannot; it would need a custom server, or the backend exposed on the
 * same origin.
 *
 * Sending is unimplemented pending a decision on whether /ws/board accepts a
 * short-lived token as a
 * query parameter. That is the usual answer to this exact problem, and it would
 * make this screen writable without changing the deployment shape.
 *
 * `Avatar` IS NOT USED FOR THE INITIALS HERE
 *
 * It takes a name and an optional picture URL, and chat messages carry a *user*
 * id with no profile picture anywhere in the API. Using it would mean passing a
 * truncated id as a name, so this renders two characters directly and skips the
 * indirection.
 */
