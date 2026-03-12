"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  getMemberAttendance,
} from "@/entities/attendance"

export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] })
    },
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] })
    },
  })
}

export function useMyAttendance(from?: string, to?: string) {
  return useQuery({
    queryKey: ["attendance", "me", from, to],
    queryFn: () => getMyAttendance({ from, to }),
  })
}

export function useTodayAttendance(date?: string) {
  return useQuery({
    queryKey: ["attendance", "today", date],
    queryFn: () => getTodayAttendance(date),
  })
}

export function useMemberAttendance(id: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["attendance", id, from, to],
    queryFn: () => getMemberAttendance(id, { from, to }),
    enabled: !!id,
  })
}
