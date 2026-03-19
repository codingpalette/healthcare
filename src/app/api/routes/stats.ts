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

/** 출석 통계 조회 (트레이너 전용) */
statsRoutes.get("/attendance", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const daysParam = c.req.query("days")
  let days = daysParam ? parseInt(daysParam, 10) : 30
  if (isNaN(days) || days < 1) days = 1
  if (days > 90) days = 90

  const adminSupabase = createAdminSupabase()
  const now = new Date()

  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
  startDate.setUTCHours(0, 0, 0, 0)

  // 전체 회원 수 조회
  const { data: memberData, error: memberError } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .is("deleted_at", null)

  if (memberError) return c.json({ error: memberError.message }, 400)
  const totalMembers = (memberData ?? []).length

  // 기간 내 출석 데이터 조회
  const { data: attendanceData, error: attendanceError } = await adminSupabase
    .from("attendance")
    .select("user_id, check_in_at")
    .gte("check_in_at", startDate.toISOString())

  if (attendanceError) return c.json({ error: attendanceError.message }, 400)

  const rows = attendanceData ?? []

  // 날짜별 고유 user_id 집계
  const dateUserMap = new Map<string, Set<string>>()
  // 요일별(0=일~6=토) user_id Set 집계
  const weekdayUserMap = new Map<number, Map<string, Set<string>>>() // weekday -> date -> users
  // 회원별 출석일수
  const memberAttendanceMap = new Map<string, Set<string>>() // userId -> Set<date>

  for (const row of rows) {
    if (!row.check_in_at) continue
    const dateStr = (row.check_in_at as string).split("T")[0]
    const d = new Date(row.check_in_at as string)
    const weekday = d.getUTCDay()

    if (!dateUserMap.has(dateStr)) dateUserMap.set(dateStr, new Set())
    dateUserMap.get(dateStr)!.add(row.user_id as string)

    if (!weekdayUserMap.has(weekday)) weekdayUserMap.set(weekday, new Map())
    const wMap = weekdayUserMap.get(weekday)!
    if (!wMap.has(dateStr)) wMap.set(dateStr, new Set())
    wMap.get(dateStr)!.add(row.user_id as string)

    if (!memberAttendanceMap.has(row.user_id as string)) memberAttendanceMap.set(row.user_id as string, new Set())
    memberAttendanceMap.get(row.user_id as string)!.add(dateStr)
  }

  // dailyData
  const allDates = generateDateRange(startDate, now)
  const dailyData = allDates.map((date) => {
    const count = dateUserMap.get(date)?.size ?? 0
    return { date, count, rate: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0 }
  })

  // weekdayData
  const weekdayData = Array.from({ length: 7 }, (_, wd) => {
    const wMap = weekdayUserMap.get(wd)
    if (!wMap || wMap.size === 0) return { weekday: wd, avgCount: 0 }
    const totalCount = Array.from(wMap.values()).reduce((sum, s) => sum + s.size, 0)
    return { weekday: wd, avgCount: Math.round(totalCount / wMap.size) }
  })

  // 오늘/어제
  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)
  const today = dateUserMap.get(todayStr)?.size ?? 0
  const yesterday = dateUserMap.get(yesterdayStr)?.size ?? 0

  // 회원별 출석 랭킹 (상위 20명)
  const memberRankingRaw = Array.from(memberAttendanceMap.entries()).map(([userId, dateSet]) => ({
    userId,
    totalDays: dateSet.size,
    attendanceRate: Math.round((dateSet.size / days) * 100),
  }))
  memberRankingRaw.sort((a, b) => b.totalDays - a.totalDays)
  const top20 = memberRankingRaw.slice(0, 20)

  // 프로필 조회
  const top20Ids = top20.map((r) => r.userId)
  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .in("id", top20Ids)

  const profileMap = new Map((profileData ?? []).map((p) => [p.id, p.name as string]))
  const memberRanking = top20.map((r) => ({
    userId: r.userId,
    name: profileMap.get(r.userId) ?? "",
    attendanceRate: r.attendanceRate,
    totalDays: r.totalDays,
  }))

  return c.json({ today, yesterday, totalMembers, dailyData, weekdayData, memberRanking })
})

/** 회원 통계 조회 (트레이너 전용) */
statsRoutes.get("/members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const daysParam = c.req.query("days")
  let days = daysParam ? parseInt(daysParam, 10) : 90
  if (isNaN(days) || days < 1) days = 1
  if (days > 365) days = 365

  const adminSupabase = createAdminSupabase()
  const now = new Date()

  // 전체 회원 조회
  const { data: allMembers, error: memberError } = await adminSupabase
    .from("profiles")
    .select("id, name, created_at")
    .eq("role", "member")
    .is("deleted_at", null)

  if (memberError) return c.json({ error: memberError.message }, 400)

  const members = allMembers ?? []
  const totalMembers = members.length

  // 최근 30일 활성 회원 판단을 위한 출석 데이터
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0)

  const { data: recentAttendance } = await adminSupabase
    .from("attendance")
    .select("user_id, check_in_at")
    .gte("check_in_at", thirtyDaysAgo.toISOString())

  const activeUserIds = new Set((recentAttendance ?? []).map((r) => r.user_id as string))
  const activeMembers = activeUserIds.size
  const inactiveMembers = totalMembers - activeMembers

  // 이번달/지난달 신규 회원
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const newThisMonth = members.filter((m) => new Date(m.created_at as string) >= thisMonthStart).length
  const newLastMonth = members.filter((m) => {
    const d = new Date(m.created_at as string)
    return d >= lastMonthStart && d < thisMonthStart
  }).length

  // signupTrend - field renamed from label to date
  let signupTrend: { date: string; count: number }[]
  if (days <= 30) {
    const startDate = new Date(now)
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
    startDate.setUTCHours(0, 0, 0, 0)
    const allDates = generateDateRange(startDate, now)
    const countMap = new Map<string, number>()
    for (const m of members) {
      const d = toDateString(new Date(m.created_at as string))
      if (allDates.includes(d)) countMap.set(d, (countMap.get(d) ?? 0) + 1)
    }
    signupTrend = allDates.map((date) => ({ date, count: countMap.get(date) ?? 0 }))
  } else {
    const monthMap = new Map<string, number>()
    const startDate = new Date(now)
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
    for (const m of members) {
      const d = new Date(m.created_at as string)
      if (d >= startDate) {
        const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
        monthMap.set(label, (monthMap.get(label) ?? 0) + 1)
      }
    }
    signupTrend = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }))
  }

  // retentionTrend: 최근 6개월 월별 유지율
  // 성능 개선: 6개월치 출석 데이터를 한 번에 조회 후 JS에서 월별 집계
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
  const { data: allRetentionAttendance } = await adminSupabase
    .from("attendance")
    .select("user_id, check_in_at")
    .gte("check_in_at", sixMonthsAgo.toISOString())

  // 월별 활성 user_id Set 구성
  const monthActiveMap = new Map<string, Set<string>>()
  for (const r of allRetentionAttendance ?? []) {
    if (!r.check_in_at) continue
    const monthKey = (r.check_in_at as string).substring(0, 7)
    if (!monthActiveMap.has(monthKey)) monthActiveMap.set(monthKey, new Set())
    monthActiveMap.get(monthKey)!.add(r.user_id as string)
  }

  const retentionTrend: { month: string; rate: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const monthLabel = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`
    const monthEnd = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1))
    const membersAtMonth = members.filter((m) => new Date(m.created_at as string) < monthEnd).length
    const activeThisMonth = monthActiveMap.get(monthLabel)?.size ?? 0
    retentionTrend.push({
      month: monthLabel,
      rate: membersAtMonth > 0 ? Math.round((activeThisMonth / membersAtMonth) * 100) : 0,
    })
  }

  // inactiveList: 비활성 회원 마지막 출석일 (상위 20명)
  const inactiveMemberList = members.filter((m) => !activeUserIds.has(m.id as string))
  const inactiveIds = inactiveMemberList.map((m) => m.id as string)
  let inactiveList: { userId: string; name: string; lastAttendance: string | null }[] = []
  if (inactiveIds.length > 0) {
    const { data: lastAttendanceData } = await adminSupabase
      .from("attendance")
      .select("user_id, check_in_at")
      .in("user_id", inactiveIds)
      .order("check_in_at", { ascending: false })
    const lastAttendanceMap = new Map<string, string>()
    for (const r of lastAttendanceData ?? []) {
      if (!lastAttendanceMap.has(r.user_id as string)) {
        lastAttendanceMap.set(r.user_id as string, (r.check_in_at as string).split("T")[0])
      }
    }
    inactiveList = inactiveMemberList
      .slice(0, 20)
      .map((m) => ({ userId: m.id as string, name: m.name as string, lastAttendance: lastAttendanceMap.get(m.id as string) ?? null }))
  }

  return c.json({
    totalMembers,
    activeMembers,
    inactiveMembers,
    newThisMonth,
    newLastMonth,
    signupTrend,
    retentionTrend,
    inactiveList,
  })
})

/** 식단 통계 조회 (트레이너 전용) */
statsRoutes.get("/diet", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const daysParam = c.req.query("days")
  let days = daysParam ? parseInt(daysParam, 10) : 30
  if (isNaN(days) || days < 1) days = 1
  if (days > 90) days = 90

  const adminSupabase = createAdminSupabase()
  const now = new Date()

  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
  startDate.setUTCHours(0, 0, 0, 0)

  // 전체 회원 수
  const { data: memberData, error: memberError } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .is("deleted_at", null)

  if (memberError) return c.json({ error: memberError.message }, 400)
  const totalMembers = (memberData ?? []).length

  // 기간 내 식단 데이터 조회
  const { data: mealData, error: mealError } = await adminSupabase
    .from("meals")
    .select("user_id, meal_date, calories, carbs, protein, fat")
    .gte("meal_date", toDateString(startDate))

  if (mealError) return c.json({ error: mealError.message }, 400)

  const rows = mealData ?? []

  // 날짜별 집계
  type DayAgg = { users: Set<string>; calories: number[]; carbs: number[]; protein: number[]; fat: number[] }
  const dateMap = new Map<string, DayAgg>()

  // 회원별 집계
  type MemberAgg = { submittedDates: Set<string>; totalCalories: number; lastRecordDate: string }
  const memberMap = new Map<string, MemberAgg>()

  for (const row of rows) {
    const dateStr = row.meal_date as string
    if (!dateMap.has(dateStr)) dateMap.set(dateStr, { users: new Set(), calories: [], carbs: [], protein: [], fat: [] })
    const agg = dateMap.get(dateStr)!
    agg.users.add(row.user_id as string)
    if (row.calories != null) agg.calories.push(Number(row.calories))
    if (row.carbs != null) agg.carbs.push(Number(row.carbs))
    if (row.protein != null) agg.protein.push(Number(row.protein))
    if (row.fat != null) agg.fat.push(Number(row.fat))

    if (!memberMap.has(row.user_id as string)) memberMap.set(row.user_id as string, { submittedDates: new Set(), totalCalories: 0, lastRecordDate: "" })
    const magg = memberMap.get(row.user_id as string)!
    magg.submittedDates.add(dateStr)
    if (row.calories != null) magg.totalCalories += Number(row.calories)
    if (!magg.lastRecordDate || dateStr > magg.lastRecordDate) magg.lastRecordDate = dateStr
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  const allDates = generateDateRange(startDate, now)
  const dailyData = allDates.map((date) => {
    const agg = dateMap.get(date)
    const submitCount = agg?.users.size ?? 0
    return {
      date,
      submitCount,
      submitRate: totalMembers > 0 ? Math.round((submitCount / totalMembers) * 100) : 0,
      avgCalories: avg(agg?.calories ?? []),
      avgCarbs: avg(agg?.carbs ?? []),
      avgProtein: avg(agg?.protein ?? []),
      avgFat: avg(agg?.fat ?? []),
    }
  })

  // todaySubmitRate, yesterdaySubmitRate, avgSubmitRate 계산
  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)

  const todayEntry = dailyData.find((d) => d.date === todayStr)
  const yesterdayEntry = dailyData.find((d) => d.date === yesterdayStr)
  const todaySubmitRate = todayEntry?.submitRate ?? 0
  const yesterdaySubmitRate = yesterdayEntry?.submitRate ?? 0
  const avgSubmitRate = dailyData.length > 0
    ? Math.round(dailyData.reduce((sum, d) => sum + d.submitRate, 0) / dailyData.length)
    : 0

  // memberStats 상위 20명
  const memberStatsRaw = Array.from(memberMap.entries()).map(([userId, magg]) => ({
    userId,
    submitRate: Math.round((magg.submittedDates.size / days) * 100),
    avgCalories: magg.submittedDates.size > 0 ? Math.round(magg.totalCalories / magg.submittedDates.size) : 0,
    lastRecordDate: magg.lastRecordDate || null,
  }))
  memberStatsRaw.sort((a, b) => b.submitRate - a.submitRate)
  const top20 = memberStatsRaw.slice(0, 20)

  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .in("id", top20.map((r) => r.userId))

  const profileMap = new Map((profileData ?? []).map((p) => [p.id, p.name as string]))
  const memberStats = top20.map((r) => ({ ...r, name: profileMap.get(r.userId) ?? "" }))

  return c.json({ todaySubmitRate, yesterdaySubmitRate, avgSubmitRate, totalMembers, dailyData, memberStats })
})

/** 운동 통계 조회 (트레이너 전용) */
statsRoutes.get("/workout", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const daysParam = c.req.query("days")
  let days = daysParam ? parseInt(daysParam, 10) : 30
  if (isNaN(days) || days < 1) days = 1
  if (days > 90) days = 90

  const adminSupabase = createAdminSupabase()
  const now = new Date()

  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
  startDate.setUTCHours(0, 0, 0, 0)

  // 전체 회원 수
  const { data: memberData, error: memberError } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .is("deleted_at", null)

  if (memberError) return c.json({ error: memberError.message }, 400)
  const totalMembers = (memberData ?? []).length

  // 기간 내 운동 데이터 조회
  const { data: workoutData, error: workoutError } = await adminSupabase
    .from("workouts")
    .select("user_id, workout_date, exercise_name")
    .gte("workout_date", toDateString(startDate))

  if (workoutError) return c.json({ error: workoutError.message }, 400)

  const rows = workoutData ?? []

  // 날짜별 고유 user_id
  const dateUserMap = new Map<string, Set<string>>()
  // 운동 종목별 빈도
  const exerciseCountMap = new Map<string, number>()
  // 회원별 집계 (성능 개선: totalWorkouts 카운터 직접 증분)
  type MemberWorkoutAgg = { recordedDates: Set<string>; exercises: Map<string, number>; lastRecordDate: string; totalWorkouts: number }
  const memberMap = new Map<string, MemberWorkoutAgg>()

  for (const row of rows) {
    const dateStr = row.workout_date as string
    const userId = row.user_id as string
    const exerciseName = (row.exercise_name as string) ?? ""

    if (!dateUserMap.has(dateStr)) dateUserMap.set(dateStr, new Set())
    dateUserMap.get(dateStr)!.add(userId)

    if (exerciseName) exerciseCountMap.set(exerciseName, (exerciseCountMap.get(exerciseName) ?? 0) + 1)

    if (!memberMap.has(userId)) memberMap.set(userId, { recordedDates: new Set(), exercises: new Map(), lastRecordDate: "", totalWorkouts: 0 })
    const magg = memberMap.get(userId)!
    magg.recordedDates.add(dateStr)
    magg.totalWorkouts += 1
    if (exerciseName) magg.exercises.set(exerciseName, (magg.exercises.get(exerciseName) ?? 0) + 1)
    if (!magg.lastRecordDate || dateStr > magg.lastRecordDate) magg.lastRecordDate = dateStr
  }

  const allDates = generateDateRange(startDate, now)
  // dailyData: field renamed from count to recordCount
  const dailyData = allDates.map((date) => {
    const recordCount = dateUserMap.get(date)?.size ?? 0
    return { date, recordCount, recordRate: totalMembers > 0 ? Math.round((recordCount / totalMembers) * 100) : 0 }
  })

  // todayRecordRate, yesterdayRecordRate, avgRecordRate 계산
  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)

  const todayEntry = dailyData.find((d) => d.date === todayStr)
  const yesterdayEntry = dailyData.find((d) => d.date === yesterdayStr)
  const todayRecordRate = todayEntry?.recordRate ?? 0
  const yesterdayRecordRate = yesterdayEntry?.recordRate ?? 0
  const avgRecordRate = dailyData.length > 0
    ? Math.round(dailyData.reduce((sum, d) => sum + d.recordRate, 0) / dailyData.length)
    : 0

  // exerciseDistribution 상위 10개 - field renamed from name to exerciseName
  const exerciseDistribution = Array.from(exerciseCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([exerciseName, count]) => ({ exerciseName, count }))

  // memberStats 상위 20명 - fields renamed: favoriteExercise→topExercise, lastDate→lastRecordDate
  const memberStatsRaw = Array.from(memberMap.entries()).map(([userId, magg]) => {
    const topExercise = Array.from(magg.exercises.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    return {
      userId,
      recordRate: Math.round((magg.recordedDates.size / days) * 100),
      totalWorkouts: magg.totalWorkouts,
      topExercise,
      lastRecordDate: magg.lastRecordDate || null,
    }
  })
  memberStatsRaw.sort((a, b) => b.recordRate - a.recordRate)
  const top20 = memberStatsRaw.slice(0, 20)

  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .in("id", top20.map((r) => r.userId))

  const profileMap = new Map((profileData ?? []).map((p) => [p.id, p.name as string]))
  const memberStats = top20.map((r) => ({ ...r, name: profileMap.get(r.userId) ?? "" }))

  return c.json({ todayRecordRate, yesterdayRecordRate, avgRecordRate, totalMembers, dailyData, exerciseDistribution, memberStats })
})

/** 인바디 통계 조회 (트레이너 전용) */
statsRoutes.get("/inbody", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const monthsParam = c.req.query("months")
  let months = monthsParam ? parseInt(monthsParam, 10) : 6
  if (isNaN(months) || months < 1) months = 1
  if (months > 12) months = 12

  const adminSupabase = createAdminSupabase()
  const now = new Date()

  // 이번 달 1일
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const thisMonthStartStr = toDateString(thisMonthStart)

  // months개월 전 시작일
  const startMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))
  const startMonthStr = toDateString(startMonthDate)

  // 전체 회원 조회 (이름 포함)
  const { data: memberData, error: memberError } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .eq("role", "member")
    .is("deleted_at", null)

  if (memberError) return c.json({ error: memberError.message }, 400)

  const allMembers = memberData ?? []
  const totalMembers = allMembers.length
  const memberNameMap = new Map(allMembers.map((m) => [m.id as string, m.name as string]))

  // 기간 내 인바디 데이터 조회
  const { data: inbodyData, error: inbodyError } = await adminSupabase
    .from("inbody_records")
    .select("user_id, measured_date, weight, skeletal_muscle_mass, body_fat_percentage")
    .gte("measured_date", startMonthStr)
    .order("measured_date", { ascending: true })

  if (inbodyError) return c.json({ error: inbodyError.message }, 400)

  const rows = inbodyData ?? []

  // 이번 달 측정 회원 Set
  const measuredThisMonthSet = new Set(
    rows.filter((r) => (r.measured_date as string) >= thisMonthStartStr).map((r) => r.user_id as string)
  )
  const measuredThisMonth = measuredThisMonthSet.size
  const unmeasuredThisMonth = totalMembers - measuredThisMonth

  // monthlyAvgTrend: measured_date의 YYYY-MM 그룹별 평균
  // fields renamed: avgSkeletalMuscleMass→avgMuscleMass, avgBodyFatPercentage→avgBodyFatPct
  type MonthAgg = { weight: number[]; muscleMass: number[]; bodyFatPct: number[] }
  const monthAggMap = new Map<string, MonthAgg>()
  for (const row of rows) {
    const month = (row.measured_date as string).substring(0, 7)
    if (!monthAggMap.has(month)) monthAggMap.set(month, { weight: [], muscleMass: [], bodyFatPct: [] })
    const agg = monthAggMap.get(month)!
    if (row.weight != null) agg.weight.push(Number(row.weight))
    if (row.skeletal_muscle_mass != null) agg.muscleMass.push(Number(row.skeletal_muscle_mass))
    if (row.body_fat_percentage != null) agg.bodyFatPct.push(Number(row.body_fat_percentage))
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null

  const monthlyAvgTrend = Array.from(monthAggMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, agg]) => ({
      month,
      avgWeight: avg(agg.weight),
      avgMuscleMass: avg(agg.muscleMass),
      avgBodyFatPct: avg(agg.bodyFatPct),
    }))

  // memberOverview: 회원별 최신 기록
  // fields: lastMeasuredDate, latestWeight, latestMuscleMass, latestBodyFatPct, measuredThisMonth (boolean), name
  const memberLatestMap = new Map<string, typeof rows[0]>()
  for (const row of rows) {
    const userId = row.user_id as string
    const existing = memberLatestMap.get(userId)
    if (!existing || (row.measured_date as string) > (existing.measured_date as string)) {
      memberLatestMap.set(userId, row)
    }
  }

  const memberOverview = Array.from(memberLatestMap.entries()).map(([userId, row]) => ({
    userId,
    name: memberNameMap.get(userId) ?? "",
    lastMeasuredDate: row.measured_date as string,
    latestWeight: row.weight != null ? Number(row.weight) : null,
    latestMuscleMass: row.skeletal_muscle_mass != null ? Number(row.skeletal_muscle_mass) : null,
    latestBodyFatPct: row.body_fat_percentage != null ? Number(row.body_fat_percentage) : null,
    measuredThisMonth: measuredThisMonthSet.has(userId),
  }))

  return c.json({ totalMembers, measuredThisMonth, unmeasuredThisMonth, monthlyAvgTrend, memberOverview })
})
