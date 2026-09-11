import { api, asList } from "@/lib/api-client";

import type { Announcement, CreateAnnouncementPayload } from "./types";

/** Scoped by the backend to the current user's audience group. */
export const getMyAnnouncements = async () =>
  asList<Announcement>(await api.get("/announcements"), "GET /announcements");

/** [HR+] */
export const createAnnouncement = (payload: CreateAnnouncementPayload) =>
  api.post<Announcement>("/announcements", payload);

/** [HR+] */
export const deleteAnnouncement = (id: string) =>
  api.delete<void>(`/announcements/${id}`);
