import { api, asList } from "@/lib/api-client";

import type {
  AddBoardMemberPayload,
  BoardActivityEntry,
  BoardChatMessage,
  BoardDocument,
  BoardMember,
  BoardMembership,
  UploadBoardDocumentPayload,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Membership
// ─────────────────────────────────────────────────────────────────────────────

/** The gate. Returns for members; 403s for everyone else. */
export const getMyMembership = () =>
  api.get<BoardMembership | boolean>("/board/membership/me");

/** Records that the caller entered the room. Audited in the activity log. */
export const enterBoardRoom = () => api.post<void>("/board/enter");

export const listBoardMembers = async () =>
  asList<BoardMember>(await api.get("/board/members"), "GET /board/members");

/** [ROLE_ADMIN] `userId` is a user id, not an employee id. */
export const addBoardMember = (payload: AddBoardMemberPayload) =>
  api.post<BoardMember>("/board/members", payload);

export const removeBoardMember = (id: string) =>
  api.delete<void>(`/board/members/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Activity and chat
// ─────────────────────────────────────────────────────────────────────────────

export const getActivityLog = async (filters: { userId?: string } = {}) =>
  asList<BoardActivityEntry>(
    await api.get("/board/activity-log", { query: { ...filters } }),
    "GET /board/activity-log",
  );

/** Read-only. Sending happens over the /ws/board WebSocket, not REST. */
export const getChatHistory = async () =>
  asList<BoardChatMessage>(
    await api.get("/board/chat/messages"),
    "GET /board/chat/messages",
  );

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Documents
// ─────────────────────────────────────────────────────────────────────────────

export const listBoardDocuments = async () =>
  asList<BoardDocument>(await api.get("/board/documents"), "GET /board/documents");

/**
 * multipart/form-data, with `isRecording` as a QUERY parameter rather than a
 * form field — that is what the docs show, and the two are not interchangeable.
 */
export const uploadBoardDocument = ({
  file,
  isRecording = false,
}: UploadBoardDocumentPayload) => {
  const body = new FormData();
  body.append("file", file);

  return api.post<BoardDocument>("/board/documents", body, {
    query: { isRecording: String(isRecording) },
  });
};

export const deleteBoardDocument = (id: string) =>
  api.delete<void>(`/board/documents/${id}`);

/** Same-origin path for an `<a href download>`. See policy-documents/api.ts. */
export const boardDocumentDownloadUrl = (id: string) =>
  `/api/board/documents/${id}/download`;

/*
 * CHAT IS READ-ONLY HERE, AND THAT IS A REAL LIMITATION RATHER THAN AN
 * OVERSIGHT.
 *
 * The docs are explicit: "Read-only — chat messages are sent over the /ws/board
 * WebSocket, not REST." So this file can fetch history and nothing else.
 *
 * Building the send half means a WebSocket client, which is a different animal
 * from everything else in this app: a persistent connection, reconnection with
 * backoff, message ordering, and — the awkward part — authentication. The auth
 * token is in an HttpOnly cookie that JavaScript cannot read, and the browser
 * WebSocket API cannot set headers. A same-origin `ws://` connection would send
 * the cookie automatically, but this app talks to the backend through a Next
 * proxy route, and proxying a WebSocket upgrade is not something the current
 * route handler does.
 *
 * So the chat screen shows history and says plainly that it cannot send. That
 * is worth doing on its own — a board member can read what was discussed — and
 * it is honest about the half that is missing.
 */
