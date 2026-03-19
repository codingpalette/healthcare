"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyAccessStats, getAttendanceStats, getMemberStats, getDietStats, getWorkoutStats, getInbodyStats } from "@/entities/stats"

const STATS_STALE_TIME = 5 * 60 * 1000 // 5분

export function useDailyAccessStats(days: number = 30) {
  return useQuery({
    queryKey: ["stats", "daily-access", days],
    queryFn: () => getDailyAccessStats(days),
    staleTime: STATS_STALE_TIME,
  })
}

export function useAttendanceStats(days: number = 30) {
  return useQuery({
    queryKey: ["stats", "attendance", days],
    queryFn: () => getAttendanceStats(days),
    staleTime: STATS_STALE_TIME,
  })
}

export function useMemberStats(days: number = 90) {
  return useQuery({
    queryKey: ["stats", "members", days],
    queryFn: () => getMemberStats(days),
    staleTime: STATS_STALE_TIME,
  })
}

export function useDietStats(days: number = 30) {
  return useQuery({
    queryKey: ["stats", "diet", days],
    queryFn: () => getDietStats(days),
    staleTime: STATS_STALE_TIME,
  })
}

export function useWorkoutStats(days: number = 30) {
  return useQuery({
    queryKey: ["stats", "workout", days],
    queryFn: () => getWorkoutStats(days),
    staleTime: STATS_STALE_TIME,
  })
}

export function useInbodyStats(months: number = 6) {
  return useQuery({
    queryKey: ["stats", "inbody", months],
    queryFn: () => getInbodyStats(months),
    staleTime: STATS_STALE_TIME,
  })
}
