"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removePushSubscription,
  savePushSubscription,
  syncNotifications,
  updateNotificationPreferences,
} from "@/entities/notification"
import type {
  NotificationPreferencesInput,
  PushSubscriptionInput,
} from "@/entities/notification"

export function useNotifications(limit = 20, unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", limit, unreadOnly],
    queryFn: () => getNotifications(limit, unreadOnly),
  })
}

export function useSyncNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: getNotificationPreferences,
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: NotificationPreferencesInput) => updateNotificationPreferences(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] })
    },
  })
}

export function useSavePushSubscription() {
  return useMutation({
    mutationFn: (input: PushSubscriptionInput) => savePushSubscription(input),
  })
}

export function useRemovePushSubscription() {
  return useMutation({
    mutationFn: (endpoint: string) => removePushSubscription(endpoint),
  })
}
