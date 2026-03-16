"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyAccessStats } from "@/entities/stats"

export function useDailyAccessStats(days: number = 30) {
  return useQuery({
    queryKey: ["stats", "daily-access", days],
    queryFn: () => getDailyAccessStats(days),
  })
}
