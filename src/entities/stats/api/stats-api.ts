import { supabase } from "@/shared/api/supabase"
import type { DailyAccessStats, AttendanceStats, MemberStats, DietStats, WorkoutStats, InbodyStats } from "@/entities/stats/model/types"

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

export async function getAttendanceStats(days: number = 30): Promise<AttendanceStats> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/stats/attendance?days=${days}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "출석 통계 조회에 실패했습니다")
  }
  return await res.json() as AttendanceStats
}

export async function getMemberStats(days: number = 90): Promise<MemberStats> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/stats/members?days=${days}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 통계 조회에 실패했습니다")
  }
  return await res.json() as MemberStats
}

export async function getDietStats(days: number = 30): Promise<DietStats> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/stats/diet?days=${days}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "식단 통계 조회에 실패했습니다")
  }
  return await res.json() as DietStats
}

export async function getWorkoutStats(days: number = 30): Promise<WorkoutStats> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/stats/workout?days=${days}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 통계 조회에 실패했습니다")
  }
  return await res.json() as WorkoutStats
}

export async function getInbodyStats(months: number = 6): Promise<InbodyStats> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/stats/inbody?months=${months}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 통계 조회에 실패했습니다")
  }
  return await res.json() as InbodyStats
}
