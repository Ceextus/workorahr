"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as boardApi from "./api";
import { isBoardMember } from "./types";

export const boardKeys = {
  all: ["board"] as const,
  membership: () => [...boardKeys.all, "membership"] as const,
  members: () => [...boardKeys.all, "members"] as const,
  activity: (userId: string) => [...boardKeys.all, "activity", userId] as const,
  chat: () => [...boardKeys.all, "chat"] as const,
  documents: () => [...boardKeys.all, "documents"] as const,
};

/**
 * The gate every other query on this feature waits for.
 *
 * `retry: false` because a 403 here is the answer, not a failure — retrying it
 * three times just delays the "you are not a member" screen.
 */
export function useBoardMembership() {
  const query = useQuery({
    queryKey: boardKeys.membership(),
    queryFn: boardApi.getMyMembership,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    // A 403 is a definitive "no", so an error means not a member.
    isMember: query.isSuccess && isBoardMember(query.data),
  };
}

export function useBoardMembers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: boardKeys.members(),
    queryFn: boardApi.listBoardMembers,
    enabled,
    retry: false,
  });
}

export function useBoardActivity(
  userId: string = "",
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: boardKeys.activity(userId),
    queryFn: () => boardApi.getActivityLog(userId ? { userId } : {}),
    enabled,
    retry: false,
  });
}

export function useBoardChat({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: boardKeys.chat(),
    queryFn: boardApi.getChatHistory,
    enabled,
    retry: false,
    // No WebSocket yet, so polling is the only way new messages arrive.
    refetchInterval: enabled ? 30 * 1000 : false,
  });
}

export function useBoardDocuments({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: boardKeys.documents(),
    queryFn: boardApi.listBoardDocuments,
    enabled,
    retry: false,
  });
}

function useBoardAction<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  successMessage: string,
  failureMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || failureMessage);
    },
  });
}

export const useAddBoardMember = () =>
  useBoardAction(boardApi.addBoardMember, "Member added", "Could not add that member");

export const useRemoveBoardMember = () =>
  useBoardAction(
    boardApi.removeBoardMember,
    "Member removed",
    "Could not remove that member",
  );

export const useUploadBoardDocument = () =>
  useBoardAction(
    boardApi.uploadBoardDocument,
    "Document uploaded",
    "Could not upload that document",
  );

export const useDeleteBoardDocument = () =>
  useBoardAction(
    boardApi.deleteBoardDocument,
    "Document deleted",
    "Could not delete that document",
  );

/**
 * Records entry into the room. Deliberately quiet — no toast.
 *
 * This is an audit event, not something the user asked for, so telling them it
 * succeeded would be noise. A failure is also not worth interrupting them
 * about: the room still works, the log is just missing a line.
 */
export function useEnterBoardRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: boardApi.enterBoardRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

/*
 * EVERY QUERY HERE TAKES AN `enabled` FLAG, AND THAT IS THE WHOLE ARCHITECTURE
 * OF THIS FEATURE.
 *
 * Membership resolves first. Until it does — and unless it says yes — nothing
 * else fires. A non-member landing on /board would otherwise send five
 * simultaneous requests that all 403, filling their network tab with errors and
 * the server log with noise, to render a screen that says "you are not a
 * member".
 *
 * So the page reads `isMember` and passes it down as `enabled`. One request
 * decides whether the other five happen at all.
 *
 * THE CHAT POLLS EVERY 30 SECONDS, WHICH IS A STOPGAP AND SHOULD BE SAID SO
 *
 * Messages are sent over /ws/board, which this app does not connect to — see
 * the note in api.ts. Without a socket, polling is the only way a message
 * someone else sent ever appears.
 *
 * 30s is chosen to be useless enough to be honest: it is visibly not a chat
 * client, which is better than a 2s poll that feels almost live and hammers the
 * server. `refetchInterval: false` when disabled matters — otherwise a
 * non-member's page would poll a 403 forever in the background.
 */
