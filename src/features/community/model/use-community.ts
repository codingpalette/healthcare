"use client"

import { useEffect, useMemo } from "react"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/shared/api/supabase"
import {
  getCommunityStatus,
  joinCommunity,
  leaveCommunity,
  getCommunityMessages,
  sendCommunityMessage,
} from "@/entities/community"
import type { CommunityMessagesPage } from "@/entities/community"

const MESSAGES_PER_PAGE = 50

export function useCommunityStatus() {
  return useQuery({
    queryKey: ["community", "status"],
    queryFn: getCommunityStatus,
  })
}

export function useCommunityMessages() {
  const query = useInfiniteQuery({
    queryKey: ["community", "messages"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getCommunityMessages({ limit: MESSAGES_PER_PAGE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CommunityMessagesPage) => {
      if (!lastPage.hasMore || !lastPage.messages.length) return undefined
      return lastPage.messages[0].createdAt
    },
    enabled: true, // will be conditionally enabled in component
  })

  const messages = useMemo(() => {
    if (!query.data?.pages) return []
    return [...query.data.pages].reverse().flatMap((page) => page.messages)
  }, [query.data?.pages])

  return { ...query, messages }
}

export function useJoinCommunity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nickname: string) => joinCommunity(nickname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] })
    },
  })
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => leaveCommunity(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] })
    },
  })
}

export function useSendCommunityMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => sendCommunityMessage(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "messages"] })
    },
  })
}

// Supabase Realtime for community messages
export function useCommunityRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel("community-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community", "messages"] })
        }
      )
      .subscribe()

    const membersChannel = supabase
      .channel("community-members")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community", "status"] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      void supabase.removeChannel(membersChannel)
    }
  }, [queryClient])
}
