import { supabase } from "@/shared/api/supabase"
import type { DailyAccessStats } from "@/entities/stats/model/types"

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function getDailyAccessStats(days: number = 30): Promise<DailyAccessStats> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/stats/daily-access?days=${days}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "접속 통계 조회에 실패했습니다")
  }
  return await res.json() as DailyAccessStats
}
