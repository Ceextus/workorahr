export const TARGET_AUDIENCES = [
  "ALL",
  "EMPLOYEE",
  "HR",
  "MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
  "BOARD_MEMBERS",
] as const;

/*
 * SUPER_ADMIN and BOARD_MEMBERS are new. Omitting targetAudiences entirely, or
 * sending an empty array, means everyone — so "ALL" and "absent" are the same
 * thing to the backend.
 */
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  targetAudiences: TargetAudience[];
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  pinned?: boolean;
  /** ISO datetime */
  expiresAt?: string;
  targetAudiences: TargetAudience[];
}
