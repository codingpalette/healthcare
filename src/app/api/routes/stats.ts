import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/shared/api/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

export const statsRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)

/** 날짜 문자열(YYYY-MM-DD) 생성 헬퍼 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

/** 시작일부터 종료일까지 날짜 배열 생성 (YYYY-MM-DD, 오름차순) */
function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const cursor = new Date(startDate)
  cursor.setUTCHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setUTCHours(0, 0, 0, 0)

  while (cursor <= end) {
    dates.push(toDateString(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/** 일별 접속 통계 조회 (트레이너 전용) */
statsRoutes.get("/daily-access", async (c) => {
  // 트레이너 권한 확인
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  // days 파라미터 파싱 및 유효성 검사 (기본값 30, 최소 1, 최대 90)
  const daysParam = c.req.query("days")
  let days = daysParam ? parseInt(daysParam, 10) : 30
  if (isNaN(days) || days < 1) days = 1
  if (days > 90) days = 90

  const adminSupabase = createAdminSupabase()
  const now = new Date()

  // 조회 시작일 계산 (days일 전 00:00:00 UTC)
  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
  startDate.setUTCHours(0, 0, 0, 0)

  // user_devices에서 기간 내 last_active_at 데이터 조회
  const { data, error } = await adminSupabase
    .from("user_devices")
    .select("user_id, last_active_at")
    .gte("last_active_at", startDate.toISOString())

  if (error) return c.json({ error: error.message }, 400)

  const rows = data ?? []

  // JS에서 날짜별로 고유 user_id 집계
  const dateUserMap = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.last_active_at) continue
    const dateStr = row.last_active_at.split("T")[0]
    if (!dateUserMap.has(dateStr)) {
      dateUserMap.set(dateStr, new Set())
    }
    dateUserMap.get(dateStr)!.add(row.user_id)
  }

  // 범위 내 모든 날짜 생성 (누락된 날짜는 count 0)
  const allDates = generateDateRange(startDate, now)
  const chartData = allDates.map((date) => ({
    date,
    count: dateUserMap.get(date)?.size ?? 0,
  }))

  // 오늘 / 어제 카운트 계산
  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)

  const today = dateUserMap.get(todayStr)?.size ?? 0
  const yesterday = dateUserMap.get(yesterdayStr)?.size ?? 0

  return c.json({ today, yesterday, data: chartData })
})
