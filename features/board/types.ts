/**
 * GET /board/membership/me
 *
 * The docs do not show the response, and the two plausible shapes are a bare
 * boolean and an object. `isBoardMember` below accepts either.
 */
export interface BoardMembership {
  member?: boolean | null;
  isMember?: boolean | null;
  userId?: string | null;
  joinedAt?: string | null;
}

export interface BoardMember {
  id: string;
  userId: string;
  name?: string | null;
  email?: string | null;
  addedAt?: string | null;
}

export interface BoardActivityEntry {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action?: string | null;
  detail?: string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
}

export interface BoardChatMessage {
  id: string;
  userId?: string | null;
  userName?: string | null;
  content?: string | null;
  message?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
}

export interface BoardDocument {
  id: string;
  title?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  isRecording?: boolean | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}

export interface AddBoardMemberPayload {
  /** A USER id, not an employee id. Requires ROLE_ADMIN. */
  userId: string;
}

export interface UploadBoardDocumentPayload {
  file: File;
  /** Meeting recordings are flagged separately from ordinary papers. */
  isRecording?: boolean;
}

/**
 * Is the caller a board member?
 *
 * Accepts `true`, `{ member: true }` and `{ isMember: true }`, because the docs
 * describe the endpoint and not its response.
 */
export function isBoardMember(value: BoardMembership | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  if (typeof value.member === "boolean") return value.member;
  if (typeof value.isMember === "boolean") return value.isMember;
  // An object came back with neither flag — the endpoint answered, and it only
  // answers for members, so treat a 200 with a body as admission.
  return true;
}

/** Chat and activity rows use different field names in different backends. */
export function messageText(message: BoardChatMessage): string {
  return message.content ?? message.message ?? "";
}

export function messageTime(message: BoardChatMessage): string | null {
  return message.sentAt ?? message.createdAt ?? null;
}

/*
 * THE BOARD ROOM IS THE ONLY MEMBERSHIP-GATED FEATURE IN THE APP.
 *
 * Everything else is rank-gated: HR sees payroll, MANAGER approves leave, and
 * lib/permissions.ts can answer from `userType` alone with no request.
 *
 * The board is a list. The docs say so — "Requires the current user to be a
 * Board Room member (the seeded admin@ems.com account is auto-enrolled)" — and
 * an ADMIN who was never added is refused like anyone else. So the only way to
 * know is to ask, which is why /board/membership/me exists and why the sidebar
 * link carries no `minRole`.
 *
 * The practical consequence is that this feature has a loading state for
 * *permission itself*, which nothing else in the app does. The page cannot
 * render either the room or the refusal until that request comes back.
 *
 * ADDING A MEMBER TAKES A USER ID, WITH THE SAME PROBLEM AS INCIDENTS
 *
 * "userId is a User id (e.g. from Employees > Create Employee), not an employee
 * id." Nothing in this API maps an employee to their user id, so there can be
 * no picker — the field takes a pasted id. See the note at the foot of
 * features/incidents/types.ts, which is the same gap.
 */
