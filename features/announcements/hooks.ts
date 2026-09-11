"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as announcementsApi from "./api";

export const announcementKeys = {
  all: ["announcements"] as const,
  list: () => [...announcementKeys.all, "list"] as const,
};

export function useAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.list(),
    queryFn: announcementsApi.getMyAnnouncements,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: announcementsApi.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success("Announcement published successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to publish announcement");
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: announcementsApi.deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success("Announcement deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete announcement");
    },
  });
}
