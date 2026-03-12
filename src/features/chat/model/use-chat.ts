"use client"

import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/shared/api/supabase"
import {
  deleteChatMessage,
  ensureChatRoom,
  getChatMessages,
  getChatRooms,
  markChatRoomRead,
  sendChatMessage,
  updateChatMessage,
} from "@/entities/chat"
import type { SendChatMessageInput } from "@/entities/chat"

export function useChatRooms() {
  return useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: getChatRooms,
  })
}

export function useChatMessages(roomId: string | null) {
  return useQuery({
    queryKey: ["chat", "room", roomId, "messages"],
    queryFn: () => getChatMessages(roomId!),
    enabled: !!roomId,
  })
}

export function useSendChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SendChatMessageInput) => sendChatMessage(input),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
      queryClient.invalidateQueries({ queryKey: ["chat", "room", message.roomId, "messages"] })
    },
  })
}

export function useEnsureChatRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (counterpartId: string) => ensureChatRoom(counterpartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
    },
  })
}

export function useMarkChatRoomRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roomId: string) => markChatRoomRead(roomId),
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
      queryClient.invalidateQueries({ queryKey: ["chat", "room", roomId, "messages"] })
    },
  })
}

export function useUpdateChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      updateChatMessage(messageId, content),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
      queryClient.invalidateQueries({ queryKey: ["chat", "room", message.roomId, "messages"] })
    },
  })
}

export function useDeleteChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
      queryClient.invalidateQueries({ queryKey: ["chat"] })
    },
  })
}

export function useChatRealtime(roomId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const roomsChannel = supabase
      .channel(`chat-rooms-${roomId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
        }
      )
      .subscribe()

    const messagesChannel = roomId
      ? supabase
          .channel(`chat-messages-${roomId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
            () => {
              queryClient.invalidateQueries({ queryKey: ["chat", "room", roomId, "messages"] })
              queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
            }
          )
          .subscribe()
      : null

    return () => {
      void supabase.removeChannel(roomsChannel)
      if (messagesChannel) {
        void supabase.removeChannel(messagesChannel)
      }
    }
  }, [queryClient, roomId])
}
