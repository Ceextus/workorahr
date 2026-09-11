import { api, asList } from "@/lib/api-client";

import type { Notification } from "./types";

export const getMyNotifications = async () =>
  asList<Notification>(await api.get("/notifications"), "GET /notifications");

/** Returns a bare number in `data`, not an object. */
export const getUnreadCount = () => api.get<number>("/notifications/unread-count");

export const markAsRead = (id: string) => api.post<void>(`/notifications/${id}/read`);

export const markAllAsRead = () => api.post<void>("/notifications/read-all");
