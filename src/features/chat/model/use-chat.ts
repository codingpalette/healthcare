"use client"

import { useEffect } from "react"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import type { ChatMessagesPage, SendChatMessageInput } from "@/entities/chat"

const MESSAGES_PER_PAGE = 50

export function useChatRooms() {
  return useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: getChatRooms,
  })
}

export function useChatMessages(roomId: string | null) {
  const query = useInfiniteQuery({
    queryKey: ["chat", "room", roomId, "messages"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getChatMessages(roomId!, { limit: MESSAGES_PER_PAGE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ChatMessagesPage) => {
      if (!lastPage.hasMore || !lastPage.messages.length) return undefined
      // 가장 오래된 메시지의 created_at을 커서로 사용
      return lastPage.messages[0].createdAt
    },
    enabled: !!roomId,
  })

  // 모든 페이지의 메시지를 하나의 배열로 합침 (최신 순)
  // pages는 최신→오래된 순, 각 페이지 내 메시지도 역순으로 변환하여 최신이 위로
  const messages = query.data?.pages
    ? query.data.pages.flatMap((page) => [...page.messages].reverse())
    : []

  return {
    ...query,
    messages,
  }
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
