import { supabase } from "@/shared/api/supabase"
import type { Attendance, AttendanceWithProfile } from "@/entities/attendance/model/types"

// snake_case → camelCase 변환
function toAttendance(row: Record<string, unknown>): Attendance {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    checkInAt: row.check_in_at as string,
    checkOutAt: (row.check_out_at as string) ?? null,
    createdAt: row.created_at as string,
  }
}

function toAttendanceWithProfile(row: Record<string, unknown>): AttendanceWithProfile {
  return {
    ...toAttendance(row),
    userName: (row.user_name as string) ?? "",
  }
}

// 체크인
export async function checkIn(): Promise<Attendance> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch("/api/attendance/check-in", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "체크인에 실패했습니다")
  }

  const row = await res.json()
  return toAttendance(row)
}

// 체크아웃
export async function checkOut(): Promise<Attendance> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch("/api/attendance/check-out", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "체크아웃에 실패했습니다")
  }

  const row = await res.json()
  return toAttendance(row)
}

// 내 출석 기록 조회
export async function getMyAttendance(params?: { from?: string; to?: string }): Promise<Attendance[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)

  const query = searchParams.toString()
  const res = await fetch(`/api/attendance/me${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "출석 기록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toAttendance)
}

// 날짜별 출석 목록 조회 (트레이너용)
export async function getTodayAttendance(date?: string): Promise<AttendanceWithProfile[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const searchParams = new URLSearchParams()
  if (date) searchParams.set("date", date)

  const query = searchParams.toString()
  const res = await fetch(`/api/attendance/today${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "오늘 출석 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toAttendanceWithProfile)
}

// 특정 회원 출석 기록 조회 (트레이너용)
export async function getMemberAttendance(
  memberId: string,
  params?: { from?: string; to?: string }
): Promise<Attendance[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)

  const query = searchParams.toString()
  const res = await fetch(`/api/attendance/members/${memberId}${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 출석 기록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toAttendance)
}
