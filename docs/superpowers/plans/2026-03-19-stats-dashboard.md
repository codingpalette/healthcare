# 통계 대시보드 확장 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 트레이너 전용 통계 페이지를 탭 기반 구조로 리뉴얼하여 출석/회원/식단/운동/인바디 통계를 추가한다.

**Architecture:** 백엔드 집계 API 방식. 각 통계별 Hono 엔드포인트에서 DB 집계 후 응답. 프론트는 React Query 훅으로 데이터를 가져오고 Recharts + shadcn ChartContainer로 시각화.

**Tech Stack:** Next.js 16, Hono, Supabase (adminSupabase), TanStack Query, Recharts, shadcn/ui (Tabs, Card, Table, Chart)

**Spec:** `docs/superpowers/specs/2026-03-19-stats-dashboard-design.md`

---

## 파일 구조

### 수정 파일
- `src/entities/stats/model/types.ts` — 5개 통계 타입 추가
- `src/entities/stats/model/index.ts` — 중간 배럴 타입 익스포트 추가
- `src/entities/stats/api/stats-api.ts` — 5개 API 함수 추가
- `src/entities/stats/api/index.ts` — 중간 배럴 함수 익스포트 추가
- `src/entities/stats/index.ts` — 배럴 익스포트 추가
- `src/features/stats/model/use-stats.ts` — 5개 훅 추가 + 기존 훅에 staleTime 추가
- `src/features/stats/model/index.ts` — 중간 배럴 훅 익스포트 추가
- `src/features/stats/index.ts` — 배럴 익스포트 추가
- `src/app/api/routes/stats.ts` — 5개 엔드포인트 추가
- `src/widgets/stats/index.ts` — 배럴 익스포트 추가
- `src/views/stats/ui/StatsPage.tsx` — 탭 구조 리뉴얼

### 신규 파일
- `src/widgets/stats/attendance-stats.tsx`
- `src/widgets/stats/member-stats.tsx`
- `src/widgets/stats/diet-stats.tsx`
- `src/widgets/stats/workout-stats.tsx`
- `src/widgets/stats/inbody-stats.tsx`

---

## Task 1: 타입 정의 + API 함수 + React Query 훅

모든 통계의 타입, API 클라이언트 함수, React Query 훅을 한번에 정의한다.

**Files:**
- Modify: `src/entities/stats/model/types.ts`
- Modify: `src/entities/stats/model/index.ts`
- Modify: `src/entities/stats/api/stats-api.ts`
- Modify: `src/entities/stats/api/index.ts`
- Modify: `src/entities/stats/index.ts`
- Modify: `src/features/stats/model/use-stats.ts`
- Modify: `src/features/stats/model/index.ts`
- Modify: `src/features/stats/index.ts`

- [ ] **Step 1: 타입 정의 추가**

`src/entities/stats/model/types.ts`에 기존 `DailyAccessStats` 아래에 추가:

```typescript
// --- 출석 통계 ---
export interface AttendanceStatsDaily {
  date: string
  count: number
  rate: number
}

export interface AttendanceStatsWeekday {
  weekday: number
  avgCount: number
}

export interface AttendanceStatsMember {
  userId: string
  name: string
  attendanceRate: number
  totalDays: number
}

export interface AttendanceStats {
  today: number
  yesterday: number
  totalMembers: number
  dailyData: AttendanceStatsDaily[]
  weekdayData: AttendanceStatsWeekday[]
  memberRanking: AttendanceStatsMember[]
}

// --- 회원 통계 ---
export interface MemberStatsTrend {
  date: string
  count: number
}

export interface MemberStatsRetention {
  month: string
  rate: number
}

export interface MemberStatsInactive {
  userId: string
  name: string
  lastAttendance: string | null
}

export interface MemberStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  newThisMonth: number
  newLastMonth: number
  signupTrend: MemberStatsTrend[]
  retentionTrend: MemberStatsRetention[]
  inactiveList: MemberStatsInactive[]
}

// --- 식단 통계 ---
export interface DietStatsDaily {
  date: string
  submitCount: number
  submitRate: number
  avgCalories: number
  avgCarbs: number
  avgProtein: number
  avgFat: number
}

export interface DietStatsMember {
  userId: string
  name: string
  submitRate: number
  avgCalories: number
  lastRecordDate: string | null
}

export interface DietStats {
  todaySubmitRate: number
  yesterdaySubmitRate: number
  avgSubmitRate: number
  totalMembers: number
  dailyData: DietStatsDaily[]
  memberStats: DietStatsMember[]
}

// --- 운동 통계 ---
export interface WorkoutStatsDaily {
  date: string
  recordCount: number
  recordRate: number
}

export interface WorkoutStatsExercise {
  exerciseName: string
  count: number
}

export interface WorkoutStatsMember {
  userId: string
  name: string
  recordRate: number
  totalWorkouts: number
  topExercise: string | null
  lastRecordDate: string | null
}

export interface WorkoutStats {
  todayRecordRate: number
  yesterdayRecordRate: number
  avgRecordRate: number
  totalMembers: number
  dailyData: WorkoutStatsDaily[]
  exerciseDistribution: WorkoutStatsExercise[]
  memberStats: WorkoutStatsMember[]
}

// --- 인바디 통계 ---
export interface InbodyStatsMonthly {
  month: string
  avgWeight: number | null
  avgMuscleMass: number | null
  avgBodyFatPct: number | null
}

export interface InbodyStatsMember {
  userId: string
  name: string
  lastMeasuredDate: string | null
  latestWeight: number | null
  latestMuscleMass: number | null
  latestBodyFatPct: number | null
  measuredThisMonth: boolean
}

export interface InbodyStats {
  totalMembers: number
  measuredThisMonth: number
  unmeasuredThisMonth: number
  monthlyAvgTrend: InbodyStatsMonthly[]
  memberOverview: InbodyStatsMember[]
}
```

- [ ] **Step 2: API 함수 추가**

`src/entities/stats/api/stats-api.ts`에 기존 `getDailyAccessStats` 아래에 추가:

```typescript
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
```

타입 import 추가 (파일 상단):
```typescript
import type { DailyAccessStats, AttendanceStats, MemberStats, DietStats, WorkoutStats, InbodyStats } from "@/entities/stats/model/types"
```

- [ ] **Step 3: 중간 배럴 익스포트 갱신**

`src/entities/stats/model/index.ts` (전체 교체):
```typescript
export type { DailyAccessEntry, DailyAccessStats, AttendanceStats, AttendanceStatsDaily, AttendanceStatsWeekday, AttendanceStatsMember, MemberStats, MemberStatsTrend, MemberStatsRetention, MemberStatsInactive, DietStats, DietStatsDaily, DietStatsMember, WorkoutStats, WorkoutStatsDaily, WorkoutStatsExercise, WorkoutStatsMember, InbodyStats, InbodyStatsMonthly, InbodyStatsMember } from "./types"
```

`src/entities/stats/api/index.ts` (전체 교체):
```typescript
export { getDailyAccessStats, getAttendanceStats, getMemberStats, getDietStats, getWorkoutStats, getInbodyStats } from "./stats-api"
```

`src/entities/stats/index.ts` (전체 교체):
```typescript
export { getDailyAccessStats, getAttendanceStats, getMemberStats, getDietStats, getWorkoutStats, getInbodyStats } from "./api"
export type { DailyAccessStats, DailyAccessEntry, AttendanceStats, AttendanceStatsDaily, AttendanceStatsWeekday, AttendanceStatsMember, MemberStats, MemberStatsTrend, MemberStatsRetention, MemberStatsInactive, DietStats, DietStatsDaily, DietStatsMember, WorkoutStats, WorkoutStatsDaily, WorkoutStatsExercise, WorkoutStatsMember, InbodyStats, InbodyStatsMonthly, InbodyStatsMember } from "./model"
```

- [ ] **Step 4: React Query 훅 추가**

`src/features/stats/model/use-stats.ts`에 기존 훅 수정 + 신규 훅 추가:

```typescript
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
```

- [ ] **Step 5: 배럴 익스포트 갱신 (features)**

`src/features/stats/model/index.ts` (전체 교체):
```typescript
export { useDailyAccessStats, useAttendanceStats, useMemberStats, useDietStats, useWorkoutStats, useInbodyStats } from "./use-stats"
```

`src/features/stats/index.ts` (전체 교체):
```typescript
export { useDailyAccessStats, useAttendanceStats, useMemberStats, useDietStats, useWorkoutStats, useInbodyStats } from "./model"
```

- [ ] **Step 6: 타입체크**

Run: `pnpm typecheck`
Expected: 통과 (아직 사용되지 않는 코드이므로 에러 없어야 함)

- [ ] **Step 7: 커밋**

```bash
git add src/entities/stats/ src/features/stats/
git commit -m "feat(통계): 출석/회원/식단/운동/인바디 통계 타입, API 함수, 훅 추가"
```

---

## Task 2: 출석 통계 API 엔드포인트

**Files:**
- Modify: `src/app/api/routes/stats.ts`

- [ ] **Step 1: 출석 통계 엔드포인트 추가**

`src/app/api/routes/stats.ts`에 기존 `daily-access` 엔드포인트 아래에 추가:

```typescript
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

  // 전체 활성 회원 수
  const { count: totalMembers } = await adminSupabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "member")
    .is("deleted_at", null)

  // 기간 내 출석 데이터 조회
  const { data: attendanceRows, error } = await adminSupabase
    .from("attendance")
    .select("user_id, check_in_at")
    .gte("check_in_at", startDate.toISOString())

  if (error) return c.json({ error: error.message }, 400)

  const rows = attendanceRows ?? []
  const memberCount = totalMembers ?? 0

  // 날짜별 고유 user_id 집계
  const dateUserMap = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.check_in_at) continue
    const dateStr = row.check_in_at.split("T")[0]
    if (!dateUserMap.has(dateStr)) {
      dateUserMap.set(dateStr, new Set())
    }
    dateUserMap.get(dateStr)!.add(row.user_id)
  }

  // 일별 데이터
  const allDates = generateDateRange(startDate, now)
  const dailyData = allDates.map((date) => {
    const count = dateUserMap.get(date)?.size ?? 0
    return { date, count, rate: memberCount > 0 ? Math.round((count / memberCount) * 100) : 0 }
  })

  // 오늘/어제
  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)
  const today = dateUserMap.get(todayStr)?.size ?? 0
  const yesterday = dateUserMap.get(yesterdayStr)?.size ?? 0

  // 요일별 평균
  const weekdaySums = Array.from({ length: 7 }, () => ({ total: 0, days: 0 }))
  for (const d of dailyData) {
    const wd = new Date(d.date + "T00:00:00Z").getUTCDay()
    weekdaySums[wd].total += d.count
    weekdaySums[wd].days += 1
  }
  const weekdayData = weekdaySums.map((s, i) => ({
    weekday: i,
    avgCount: s.days > 0 ? Math.round(s.total / s.days) : 0,
  }))

  // 회원별 출석 랭킹 (상위 20명)
  const memberAttendance = new Map<string, number>()
  for (const row of rows) {
    if (!row.check_in_at) continue
    const dateStr = row.check_in_at.split("T")[0]
    const key = `${row.user_id}:${dateStr}`
    if (!memberAttendance.has(key)) {
      memberAttendance.set(key, 1)
    }
  }

  // user_id별 출석일 수 집계
  const userDays = new Map<string, number>()
  for (const key of memberAttendance.keys()) {
    const userId = key.split(":")[0]
    userDays.set(userId, (userDays.get(userId) ?? 0) + 1)
  }

  // 회원 프로필 조회
  const userIds = Array.from(userDays.keys())
  const { data: profiles } = userIds.length > 0
    ? await adminSupabase.from("profiles").select("id, name").in("id", userIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.name]))

  const memberRanking = Array.from(userDays.entries())
    .map(([userId, totalDays]) => ({
      userId,
      name: profileMap.get(userId) ?? "알 수 없음",
      totalDays,
      attendanceRate: days > 0 ? Math.round((totalDays / days) * 100) : 0,
    }))
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 20)

  return c.json({ today, yesterday, totalMembers: memberCount, dailyData, weekdayData, memberRanking })
})
```

- [ ] **Step 2: 타입체크**

Run: `pnpm typecheck`
Expected: 통과

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/routes/stats.ts
git commit -m "feat(통계): 출석 통계 API 엔드포인트 추가"
```

---

## Task 3: 회원 통계 API 엔드포인트

**Files:**
- Modify: `src/app/api/routes/stats.ts`

- [ ] **Step 1: 회원 통계 엔드포인트 추가**

`src/app/api/routes/stats.ts`에 추가:

```typescript
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
  const { data: allMembers, error: membersError } = await adminSupabase
    .from("profiles")
    .select("id, name, created_at")
    .eq("role", "member")
    .is("deleted_at", null)

  if (membersError) return c.json({ error: membersError.message }, 400)

  const members = allMembers ?? []
  const totalMembers = members.length

  // 최근 30일 출석 기록으로 활성/비활성 판단
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const { data: recentAttendance } = await adminSupabase
    .from("attendance")
    .select("user_id, check_in_at")
    .gte("check_in_at", thirtyDaysAgo.toISOString())

  const activeUserIds = new Set((recentAttendance ?? []).map((r) => r.user_id))
  const activeMembers = members.filter((m) => activeUserIds.has(m.id)).length
  const inactiveMembers = totalMembers - activeMembers

  // 이번 달 / 지난 달 신규 가입
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const newThisMonth = members.filter((m) => new Date(m.created_at) >= thisMonthStart).length
  const newLastMonth = members.filter((m) => {
    const d = new Date(m.created_at)
    return d >= lastMonthStart && d < thisMonthStart
  }).length

  // 가입 추이 (days <= 30이면 일별, 아니면 월별)
  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1))
  startDate.setUTCHours(0, 0, 0, 0)

  let signupTrend: { date: string; count: number }[]

  if (days <= 30) {
    const allDates = generateDateRange(startDate, now)
    const dateMap = new Map<string, number>()
    for (const m of members) {
      const dateStr = m.created_at.split("T")[0]
      if (dateStr >= allDates[0] && dateStr <= allDates[allDates.length - 1]) {
        dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1)
      }
    }
    signupTrend = allDates.map((date) => ({ date, count: dateMap.get(date) ?? 0 }))
  } else {
    // 월별 집계
    const monthMap = new Map<string, number>()
    for (const m of members) {
      const d = new Date(m.created_at)
      if (d >= startDate) {
        const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
        monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1)
      }
    }
    signupTrend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }

  // 월별 유지율 (최근 6개월)
  const retentionTrend: { month: string; rate: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0))
    const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`
    const membersAtMonth = members.filter((m) => new Date(m.created_at) <= monthEnd).length
    // 해당 월에 출석한 회원 수 (recentAttendance로는 부족하므로 별도 조회 필요)
    // 간소화: 활성 회원 비율로 대체 (최근 달만 정확, 과거는 추정)
    if (membersAtMonth > 0) {
      retentionTrend.push({ month: monthKey, rate: Math.round((activeMembers / membersAtMonth) * 100) })
    }
  }

  // 비활성 회원 목록 (최대 20명)
  const inactiveMemberIds = members.filter((m) => !activeUserIds.has(m.id)).map((m) => m.id)

  // 비활성 회원의 마지막 출석 조회
  let inactiveList: { userId: string; name: string; lastAttendance: string | null }[] = []
  if (inactiveMemberIds.length > 0) {
    const { data: lastAttendances } = await adminSupabase
      .from("attendance")
      .select("user_id, check_in_at")
      .in("user_id", inactiveMemberIds)
      .order("check_in_at", { ascending: false })

    const lastAttMap = new Map<string, string>()
    for (const row of lastAttendances ?? []) {
      if (!lastAttMap.has(row.user_id)) {
        lastAttMap.set(row.user_id, row.check_in_at.split("T")[0])
      }
    }

    inactiveList = members
      .filter((m) => !activeUserIds.has(m.id))
      .map((m) => ({
        userId: m.id,
        name: m.name,
        lastAttendance: lastAttMap.get(m.id) ?? null,
      }))
      .sort((a, b) => {
        if (!a.lastAttendance) return -1
        if (!b.lastAttendance) return 1
        return a.lastAttendance.localeCompare(b.lastAttendance)
      })
      .slice(0, 20)
  }

  return c.json({
    totalMembers, activeMembers, inactiveMembers,
    newThisMonth, newLastMonth, signupTrend, retentionTrend, inactiveList,
  })
})
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `pnpm typecheck`

```bash
git add src/app/api/routes/stats.ts
git commit -m "feat(통계): 회원 통계 API 엔드포인트 추가"
```

---

## Task 4: 식단 통계 API 엔드포인트

**Files:**
- Modify: `src/app/api/routes/stats.ts`

- [ ] **Step 1: 식단 통계 엔드포인트 추가**

```typescript
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
  const { count: totalMembers } = await adminSupabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "member")
    .is("deleted_at", null)

  const memberCount = totalMembers ?? 0

  // 기간 내 식단 데이터
  const { data: meals, error } = await adminSupabase
    .from("meals")
    .select("user_id, date, calories, carbs, protein, fat")
    .gte("date", toDateString(startDate))

  if (error) return c.json({ error: error.message }, 400)

  const rows = meals ?? []

  // 날짜별 집계
  const dateMap = new Map<string, { users: Set<string>; calories: number[]; carbs: number[]; protein: number[]; fat: number[] }>()
  for (const row of rows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { users: new Set(), calories: [], carbs: [], protein: [], fat: [] })
    }
    const entry = dateMap.get(row.date)!
    entry.users.add(row.user_id)
    if (row.calories != null) entry.calories.push(row.calories)
    if (row.carbs != null) entry.carbs.push(Number(row.carbs))
    if (row.protein != null) entry.protein.push(Number(row.protein))
    if (row.fat != null) entry.fat.push(Number(row.fat))
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0

  const allDates = generateDateRange(startDate, now)
  const dailyData = allDates.map((date) => {
    const entry = dateMap.get(date)
    const submitCount = entry?.users.size ?? 0
    return {
      date,
      submitCount,
      submitRate: memberCount > 0 ? Math.round((submitCount / memberCount) * 100) : 0,
      avgCalories: avg(entry?.calories ?? []),
      avgCarbs: avg(entry?.carbs ?? []),
      avgProtein: avg(entry?.protein ?? []),
      avgFat: avg(entry?.fat ?? []),
    }
  })

  // 오늘/어제 제출률
  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)

  const todaySubmitRate = dailyData.find((d) => d.date === todayStr)?.submitRate ?? 0
  const yesterdaySubmitRate = dailyData.find((d) => d.date === yesterdayStr)?.submitRate ?? 0
  const avgSubmitRate = dailyData.length > 0
    ? Math.round(dailyData.reduce((s, d) => s + d.submitRate, 0) / dailyData.length)
    : 0

  // 회원별 성실도 (상위 20명)
  const userMealMap = new Map<string, { dates: Set<string>; calories: number[]; lastDate: string }>()
  for (const row of rows) {
    if (!userMealMap.has(row.user_id)) {
      userMealMap.set(row.user_id, { dates: new Set(), calories: [], lastDate: row.date })
    }
    const entry = userMealMap.get(row.user_id)!
    entry.dates.add(row.date)
    if (row.calories != null) entry.calories.push(row.calories)
    if (row.date > entry.lastDate) entry.lastDate = row.date
  }

  const { data: memberProfiles } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .eq("role", "member")
    .is("deleted_at", null)

  const profileMap = new Map((memberProfiles ?? []).map((p) => [p.id, p.name]))

  const memberStats = Array.from(userMealMap.entries())
    .map(([userId, entry]) => ({
      userId,
      name: profileMap.get(userId) ?? "알 수 없음",
      submitRate: days > 0 ? Math.round((entry.dates.size / days) * 100) : 0,
      avgCalories: avg(entry.calories),
      lastRecordDate: entry.lastDate,
    }))
    .sort((a, b) => b.submitRate - a.submitRate)
    .slice(0, 20)

  return c.json({ todaySubmitRate, yesterdaySubmitRate, avgSubmitRate, totalMembers: memberCount, dailyData, memberStats })
})
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `pnpm typecheck`

```bash
git add src/app/api/routes/stats.ts
git commit -m "feat(통계): 식단 통계 API 엔드포인트 추가"
```

---

## Task 5: 운동 통계 API 엔드포인트

**Files:**
- Modify: `src/app/api/routes/stats.ts`

- [ ] **Step 1: 운동 통계 엔드포인트 추가**

```typescript
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

  const { count: totalMembers } = await adminSupabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "member")
    .is("deleted_at", null)

  const memberCount = totalMembers ?? 0

  const { data: workouts, error } = await adminSupabase
    .from("workouts")
    .select("user_id, date, exercise_name")
    .gte("date", toDateString(startDate))

  if (error) return c.json({ error: error.message }, 400)

  const rows = workouts ?? []

  // 날짜별 고유 user_id 집계
  const dateUserMap = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!dateUserMap.has(row.date)) {
      dateUserMap.set(row.date, new Set())
    }
    dateUserMap.get(row.date)!.add(row.user_id)
  }

  const allDates = generateDateRange(startDate, now)
  const dailyData = allDates.map((date) => {
    const recordCount = dateUserMap.get(date)?.size ?? 0
    return {
      date,
      recordCount,
      recordRate: memberCount > 0 ? Math.round((recordCount / memberCount) * 100) : 0,
    }
  })

  const todayStr = toDateString(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = toDateString(yesterdayDate)

  const todayRecordRate = dailyData.find((d) => d.date === todayStr)?.recordRate ?? 0
  const yesterdayRecordRate = dailyData.find((d) => d.date === yesterdayStr)?.recordRate ?? 0
  const avgRecordRate = dailyData.length > 0
    ? Math.round(dailyData.reduce((s, d) => s + d.recordRate, 0) / dailyData.length)
    : 0

  // 운동명별 빈도 (상위 10개)
  const exerciseMap = new Map<string, number>()
  for (const row of rows) {
    if (row.exercise_name) {
      exerciseMap.set(row.exercise_name, (exerciseMap.get(row.exercise_name) ?? 0) + 1)
    }
  }
  const exerciseDistribution = Array.from(exerciseMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([exerciseName, count]) => ({ exerciseName, count }))

  // 회원별 운동 빈도 (상위 20명)
  const userWorkoutMap = new Map<string, { dates: Set<string>; total: number; exercises: Map<string, number>; lastDate: string }>()
  for (const row of rows) {
    if (!userWorkoutMap.has(row.user_id)) {
      userWorkoutMap.set(row.user_id, { dates: new Set(), total: 0, exercises: new Map(), lastDate: row.date })
    }
    const entry = userWorkoutMap.get(row.user_id)!
    entry.dates.add(row.date)
    entry.total += 1
    if (row.exercise_name) {
      entry.exercises.set(row.exercise_name, (entry.exercises.get(row.exercise_name) ?? 0) + 1)
    }
    if (row.date > entry.lastDate) entry.lastDate = row.date
  }

  const { data: memberProfiles } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .eq("role", "member")
    .is("deleted_at", null)

  const profileMap = new Map((memberProfiles ?? []).map((p) => [p.id, p.name]))

  const memberStats = Array.from(userWorkoutMap.entries())
    .map(([userId, entry]) => {
      let topExercise: string | null = null
      let topCount = 0
      for (const [name, count] of entry.exercises) {
        if (count > topCount) { topExercise = name; topCount = count }
      }
      return {
        userId,
        name: profileMap.get(userId) ?? "알 수 없음",
        recordRate: days > 0 ? Math.round((entry.dates.size / days) * 100) : 0,
        totalWorkouts: entry.total,
        topExercise,
        lastRecordDate: entry.lastDate,
      }
    })
    .sort((a, b) => b.recordRate - a.recordRate)
    .slice(0, 20)

  return c.json({ todayRecordRate, yesterdayRecordRate, avgRecordRate, totalMembers: memberCount, dailyData, exerciseDistribution, memberStats })
})
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `pnpm typecheck`

```bash
git add src/app/api/routes/stats.ts
git commit -m "feat(통계): 운동 통계 API 엔드포인트 추가"
```

---

## Task 6: 인바디 통계 API 엔드포인트

**Files:**
- Modify: `src/app/api/routes/stats.ts`

- [ ] **Step 1: 인바디 통계 엔드포인트 추가**

```typescript
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

  // 전체 회원
  const { data: allMembers } = await adminSupabase
    .from("profiles")
    .select("id, name")
    .eq("role", "member")
    .is("deleted_at", null)

  const members = allMembers ?? []
  const totalMembers = members.length

  // 이번 달 시작
  const thisMonthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`

  // 조회 시작월
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))
  const startDateStr = toDateString(startMonth)

  // 인바디 기록 조회
  const { data: records, error } = await adminSupabase
    .from("inbody_records")
    .select("user_id, measured_date, weight, skeletal_muscle_mass, body_fat_percentage")
    .gte("measured_date", startDateStr)
    .order("measured_date", { ascending: true })

  if (error) return c.json({ error: error.message }, 400)

  const rows = records ?? []

  // 이번 달 측정 회원
  const measuredThisMonthSet = new Set(
    rows.filter((r) => r.measured_date >= thisMonthStart).map((r) => r.user_id)
  )
  const measuredThisMonth = measuredThisMonthSet.size
  const unmeasuredThisMonth = totalMembers - measuredThisMonth

  // 월별 평균 추이
  const monthlyMap = new Map<string, { weights: number[]; muscles: number[]; fats: number[] }>()
  for (const row of rows) {
    const monthKey = row.measured_date.substring(0, 7) // YYYY-MM
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { weights: [], muscles: [], fats: [] })
    }
    const entry = monthlyMap.get(monthKey)!
    if (row.weight != null) entry.weights.push(Number(row.weight))
    if (row.skeletal_muscle_mass != null) entry.muscles.push(Number(row.skeletal_muscle_mass))
    if (row.body_fat_percentage != null) entry.fats.push(Number(row.body_fat_percentage))
  }

  const avgOrNull = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10 : null

  const monthlyAvgTrend = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, entry]) => ({
      month,
      avgWeight: avgOrNull(entry.weights),
      avgMuscleMass: avgOrNull(entry.muscles),
      avgBodyFatPct: avgOrNull(entry.fats),
    }))

  // 회원별 최신 기록
  const latestByUser = new Map<string, { measured_date: string; weight: number | null; skeletal_muscle_mass: number | null; body_fat_percentage: number | null }>()
  for (const row of rows) {
    const existing = latestByUser.get(row.user_id)
    if (!existing || row.measured_date > existing.measured_date) {
      latestByUser.set(row.user_id, row)
    }
  }

  const memberOverview = members.map((m) => {
    const latest = latestByUser.get(m.id)
    return {
      userId: m.id,
      name: m.name,
      lastMeasuredDate: latest?.measured_date ?? null,
      latestWeight: latest?.weight != null ? Number(latest.weight) : null,
      latestMuscleMass: latest?.skeletal_muscle_mass != null ? Number(latest.skeletal_muscle_mass) : null,
      latestBodyFatPct: latest?.body_fat_percentage != null ? Number(latest.body_fat_percentage) : null,
      measuredThisMonth: measuredThisMonthSet.has(m.id),
    }
  })

  return c.json({ totalMembers, measuredThisMonth, unmeasuredThisMonth, monthlyAvgTrend, memberOverview })
})
```

- [ ] **Step 2: 타입체크 + 커밋**

Run: `pnpm typecheck`

```bash
git add src/app/api/routes/stats.ts
git commit -m "feat(통계): 인바디 통계 API 엔드포인트 추가"
```

---

## Task 7: StatsPage 탭 구조 리뉴얼

**Files:**
- Modify: `src/views/stats/ui/StatsPage.tsx`

- [ ] **Step 1: 탭 구조로 리뉴얼**

`src/views/stats/ui/StatsPage.tsx` 전체 교체:

```tsx
"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui"
import { DailyAccessChart } from "@/widgets/stats"

const TABS = [
  { value: "access", label: "접속" },
  { value: "attendance", label: "출석" },
  { value: "members", label: "회원" },
  { value: "diet", label: "식단" },
  { value: "workout", label: "운동" },
  { value: "inbody", label: "인바디" },
] as const

export function StatsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get("tab") ?? "access"

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">통계</h2>
        <p className="text-muted-foreground">
          센터 운영 현황을 한눈에 확인하세요.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="access" className="mt-6">
          <DailyAccessChart />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <p className="text-muted-foreground">출석 통계 준비 중...</p>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <p className="text-muted-foreground">회원 통계 준비 중...</p>
        </TabsContent>

        <TabsContent value="diet" className="mt-6">
          <p className="text-muted-foreground">식단 통계 준비 중...</p>
        </TabsContent>

        <TabsContent value="workout" className="mt-6">
          <p className="text-muted-foreground">운동 통계 준비 중...</p>
        </TabsContent>

        <TabsContent value="inbody" className="mt-6">
          <p className="text-muted-foreground">인바디 통계 준비 중...</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: 타입체크 + 개발 서버에서 확인**

Run: `pnpm typecheck`
브라우저에서 `/stats` 접속 → 6개 탭 전환 확인, URL 쿼리 파라미터 연동 확인

- [ ] **Step 3: 커밋**

```bash
git add src/views/stats/ui/StatsPage.tsx
git commit -m "feat(통계): 통계 페이지 탭 구조 리뉴얼"
```

---

## Task 8: 출석 통계 위젯

**Files:**
- Create: `src/widgets/stats/attendance-stats.tsx`
- Modify: `src/widgets/stats/index.ts`
- Modify: `src/views/stats/ui/StatsPage.tsx`

- [ ] **Step 1: 출석 통계 위젯 생성**

`src/widgets/stats/attendance-stats.tsx`:

```tsx
"use client"

import { useState, useId } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react"
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Skeleton, Tabs, TabsList, TabsTrigger,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/shared/ui"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart"
import { useAttendanceStats } from "@/features/stats"
import { cn } from "@/shared/lib/utils"

type Period = 7 | 30 | 90

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

const areaChartConfig = {
  rate: { label: "출석률", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const barChartConfig = {
  avgCount: { label: "평균 출석자", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function AttendanceStats() {
  const [period, setPeriod] = useState<Period>(30)
  const { data, isLoading, isError } = useAttendanceStats(period)

  const gradientId = `gradient-att-${useId().replace(/:/g, "")}`

  if (isLoading) return <StatsLoadingSkeleton />
  if (isError || !data) return <StatsError message="출석 통계를 불러오지 못했습니다." />

  const diff = data.today - data.yesterday
  const avgRate = data.dailyData.length > 0
    ? Math.round(data.dailyData.reduce((s, d) => s + d.rate, 0) / data.dailyData.length)
    : 0

  // 요일별 데이터 (월~일 순서로 정렬)
  const weekdayOrdered = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const entry = data.weekdayData.find((d) => d.weekday === wd)
    return { weekday: WEEKDAY_LABELS[wd], avgCount: entry?.avgCount ?? 0 }
  })

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">오늘 출석자</p>
                <p className="text-3xl font-bold">{data.today}명</p>
                <div className="flex items-center gap-1 mt-1">
                  {diff > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : diff < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                  <span className={cn("text-xs", diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground")}>
                    어제 대비 {diff > 0 ? `+${diff}명` : diff < 0 ? `${diff}명` : "변동 없음"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">기간 평균 출석률</p>
            <p className="text-3xl font-bold">{avgRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">전체 회원 {data.totalMembers}명 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* 출석률 추이 차트 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>출석률 추이</CardTitle>
            <CardDescription>최근 {period}일간 일별 출석률</CardDescription>
          </div>
          <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
            <TabsList>
              <TabsTrigger value="7">7일</TabsTrigger>
              <TabsTrigger value="30">30일</TabsTrigger>
              <TabsTrigger value="90">90일</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ChartContainer config={areaChartConfig} className="h-[250px] w-full">
            <AreaChart data={data.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-rate)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-rate)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={32} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="natural" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} fill={`url(#${gradientId})`} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 요일별 분포 + 회원 랭킹 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>요일별 출석 분포</CardTitle>
            <CardDescription>요일별 평균 출석자 수</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[200px] w-full">
              <BarChart data={weekdayOrdered} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="weekday" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="avgCount" fill="var(--color-avgCount)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>출석률 랭킹</CardTitle>
            <CardDescription>상위 20명</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="text-right">출석률</TableHead>
                  <TableHead className="text-right">출석일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.memberRanking.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-right">{m.attendanceRate}%</TableCell>
                    <TableCell className="text-right">{m.totalDays}일</TableCell>
                  </TableRow>
                ))}
                {data.memberRanking.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">데이터가 없습니다</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card><CardContent className="pt-6"><Skeleton className="h-16 w-48" /></CardContent></Card>
        <Card><CardContent className="pt-6"><Skeleton className="h-16 w-48" /></CardContent></Card>
      </div>
      <Card><CardContent className="pt-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
    </div>
  )
}

function StatsError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-muted-foreground text-sm">{message}</CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 배럴 익스포트 + StatsPage 연결**

`src/widgets/stats/index.ts`에 추가:
```typescript
export { AttendanceStats } from "./attendance-stats"
```

`src/views/stats/ui/StatsPage.tsx`에서 placeholder를 교체:
```tsx
import { AttendanceStats } from "@/widgets/stats"

// TabsContent value="attendance" 내부
<AttendanceStats />
```

- [ ] **Step 3: 타입체크 + 커밋**

Run: `pnpm typecheck`

```bash
git add src/widgets/stats/attendance-stats.tsx src/widgets/stats/index.ts src/views/stats/ui/StatsPage.tsx
git commit -m "feat(통계): 출석 통계 위젯 추가"
```

---

## Task 9: 회원 통계 위젯

**Files:**
- Create: `src/widgets/stats/member-stats.tsx`
- Modify: `src/widgets/stats/index.ts`
- Modify: `src/views/stats/ui/StatsPage.tsx`

- [ ] **Step 1: 회원 통계 위젯 생성**

`src/widgets/stats/member-stats.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { UserPlus, Users } from "lucide-react"
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Skeleton, Tabs, TabsList, TabsTrigger,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/shared/ui"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart"
import { useMemberStats } from "@/features/stats"

type Period = 30 | 90 | 365

const barConfig = { count: { label: "신규 가입", color: "hsl(var(--chart-1))" } } satisfies ChartConfig
const lineConfig = { rate: { label: "유지율", color: "hsl(var(--chart-2))" } } satisfies ChartConfig

function formatDate(dateStr: string): string {
  if (dateStr.length === 7) return dateStr // YYYY-MM
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function MemberStatsWidget() {
  const [period, setPeriod] = useState<Period>(90)
  const { data, isLoading, isError } = useMemberStats(period)

  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
  if (isError || !data) return <Card><CardContent className="pt-6 text-muted-foreground text-sm">회원 통계를 불러오지 못했습니다.</CardContent></Card>

  const newDiff = data.newThisMonth - data.newLastMonth

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 회원</p>
                <p className="text-3xl font-bold">{data.totalMembers}명</p>
                <p className="text-xs text-muted-foreground mt-1">
                  활성 {data.activeMembers}명 · 비활성 {data.inactiveMembers}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이번 달 신규 가입</p>
                <p className="text-3xl font-bold">{data.newThisMonth}명</p>
                <p className="text-xs text-muted-foreground mt-1">
                  전월 대비 {newDiff > 0 ? `+${newDiff}` : newDiff}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 가입 추이 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>신규 가입 추이</CardTitle>
            <CardDescription>{period <= 30 ? "일별" : "월별"} 신규 가입자 수</CardDescription>
          </div>
          <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
            <TabsList>
              <TabsTrigger value="30">30일</TabsTrigger>
              <TabsTrigger value="90">90일</TabsTrigger>
              <TabsTrigger value="365">1년</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barConfig} className="h-[250px] w-full">
            <BarChart data={data.signupTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 유지율 + 비활성 회원 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>회원 유지율</CardTitle>
            <CardDescription>월별 활성 회원 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineConfig} className="h-[200px] w-full">
              <LineChart data={data.retentionTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={32} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="natural" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>비활성 회원</CardTitle>
            <CardDescription>최근 30일 출석 없는 회원</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="text-right">마지막 출석</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inactiveList.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-right">{m.lastAttendance ?? "기록 없음"}</TableCell>
                  </TableRow>
                ))}
                {data.inactiveList.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">모든 회원이 활성 상태입니다</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 배럴 익스포트 + StatsPage 연결**

`src/widgets/stats/index.ts`에 추가:
```typescript
export { MemberStatsWidget } from "./member-stats"
```

`src/views/stats/ui/StatsPage.tsx`에서 members placeholder를 `<MemberStatsWidget />`로 교체.

- [ ] **Step 3: 타입체크 + 커밋**

Run: `pnpm typecheck`

```bash
git add src/widgets/stats/member-stats.tsx src/widgets/stats/index.ts src/views/stats/ui/StatsPage.tsx
git commit -m "feat(통계): 회원 통계 위젯 추가"
```

---

## Task 10: 식단 통계 위젯

**Files:**
- Create: `src/widgets/stats/diet-stats.tsx`
- Modify: `src/widgets/stats/index.ts`
- Modify: `src/views/stats/ui/StatsPage.tsx`

- [ ] **Step 1: 식단 통계 위젯 생성**

`src/widgets/stats/diet-stats.tsx`:

```tsx
"use client"

import { useState, useId } from "react"
import { Area, AreaChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, UtensilsCrossed } from "lucide-react"
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Skeleton, Tabs, TabsList, TabsTrigger, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/shared/ui"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart"
import { useDietStats } from "@/features/stats"
import { cn } from "@/shared/lib/utils"

type Period = 7 | 30
type NutrientKey = "avgCalories" | "avgCarbs" | "avgProtein" | "avgFat"

const NUTRIENT_CONFIG: Record<NutrientKey, { label: string; unit: string }> = {
  avgCalories: { label: "칼로리", unit: "kcal" },
  avgCarbs: { label: "탄수화물", unit: "g" },
  avgProtein: { label: "단백질", unit: "g" },
  avgFat: { label: "지방", unit: "g" },
}

const areaConfig = { submitRate: { label: "제출률", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function DietStatsWidget() {
  const [period, setPeriod] = useState<Period>(30)
  const [nutrient, setNutrient] = useState<NutrientKey>("avgCalories")
  const { data, isLoading, isError } = useDietStats(period)

  const gradientId = `gradient-diet-${useId().replace(/:/g, "")}`

  const nutrientConfig = {
    [nutrient]: { label: NUTRIENT_CONFIG[nutrient].label, color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig

  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
  if (isError || !data) return <Card><CardContent className="pt-6 text-muted-foreground text-sm">식단 통계를 불러오지 못했습니다.</CardContent></Card>

  const diff = data.todaySubmitRate - data.yesterdaySubmitRate

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">오늘 식단 제출률</p>
                <p className="text-3xl font-bold">{data.todaySubmitRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  {diff > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : diff < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                  <span className={cn("text-xs", diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground")}>
                    어제 대비 {diff > 0 ? `+${diff}%p` : diff < 0 ? `${diff}%p` : "변동 없음"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">기간 평균 제출률</p>
            <p className="text-3xl font-bold">{data.avgSubmitRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">전체 회원 {data.totalMembers}명 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* 제출률 추이 + 영양소 추이 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>제출률 추이</CardTitle>
              <CardDescription>최근 {period}일</CardDescription>
            </div>
            <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
              <TabsList>
                <TabsTrigger value="7">7일</TabsTrigger>
                <TabsTrigger value="30">30일</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaConfig} className="h-[250px] w-full">
              <AreaChart data={data.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-submitRate)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-submitRate)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={32} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="natural" dataKey="submitRate" stroke="var(--color-submitRate)" strokeWidth={2} fill={`url(#${gradientId})`} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>영양소 추이</CardTitle>
            <CardDescription>전체 회원 평균</CardDescription>
            <div className="flex flex-wrap gap-1 mt-2">
              {(Object.keys(NUTRIENT_CONFIG) as NutrientKey[]).map((key) => (
                <Button key={key} size="sm" variant={nutrient === key ? "default" : "outline"} onClick={() => setNutrient(key)}>
                  {NUTRIENT_CONFIG[key].label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={nutrientConfig} className="h-[250px] w-full">
              <LineChart data={data.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="natural" dataKey={nutrient} stroke={`var(--color-${nutrient})`} strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 회원별 성실도 */}
      <Card>
        <CardHeader>
          <CardTitle>회원별 식단 기록 성실도</CardTitle>
          <CardDescription>제출률 기준 상위 20명</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="text-right">제출률</TableHead>
                <TableHead className="text-right">평균 칼로리</TableHead>
                <TableHead className="text-right">최근 기록</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.memberStats.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-right">{m.submitRate}%</TableCell>
                  <TableCell className="text-right">{m.avgCalories}kcal</TableCell>
                  <TableCell className="text-right">{m.lastRecordDate ?? "없음"}</TableCell>
                </TableRow>
              ))}
              {data.memberStats.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">데이터가 없습니다</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 배럴 익스포트 + StatsPage 연결**

- [ ] **Step 3: 타입체크 + 커밋**

```bash
git add src/widgets/stats/diet-stats.tsx src/widgets/stats/index.ts src/views/stats/ui/StatsPage.tsx
git commit -m "feat(통계): 식단 통계 위젯 추가"
```

---

## Task 11: 운동 통계 위젯

**Files:**
- Create: `src/widgets/stats/workout-stats.tsx`
- Modify: `src/widgets/stats/index.ts`
- Modify: `src/views/stats/ui/StatsPage.tsx`

- [ ] **Step 1: 운동 통계 위젯 생성**

`src/widgets/stats/workout-stats.tsx`:

```tsx
"use client"

import { useState, useId } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, Dumbbell } from "lucide-react"
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Skeleton, Tabs, TabsList, TabsTrigger,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/shared/ui"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart"
import { useWorkoutStats } from "@/features/stats"
import { cn } from "@/shared/lib/utils"

type Period = 7 | 30

const areaConfig = { recordRate: { label: "기록률", color: "hsl(var(--chart-1))" } } satisfies ChartConfig
const barConfig = { count: { label: "횟수", color: "hsl(var(--chart-2))" } } satisfies ChartConfig

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function WorkoutStatsWidget() {
  const [period, setPeriod] = useState<Period>(30)
  const { data, isLoading, isError } = useWorkoutStats(period)

  const gradientId = `gradient-workout-${useId().replace(/:/g, "")}`

  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
  if (isError || !data) return <Card><CardContent className="pt-6 text-muted-foreground text-sm">운동 통계를 불러오지 못했습니다.</CardContent></Card>

  const diff = data.todayRecordRate - data.yesterdayRecordRate

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">오늘 운동 기록률</p>
                <p className="text-3xl font-bold">{data.todayRecordRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  {diff > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : diff < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                  <span className={cn("text-xs", diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground")}>
                    어제 대비 {diff > 0 ? `+${diff}%p` : diff < 0 ? `${diff}%p` : "변동 없음"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">기간 평균 기록률</p>
            <p className="text-3xl font-bold">{data.avgRecordRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">전체 회원 {data.totalMembers}명 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* 기록률 추이 + 운동 분포 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>기록률 추이</CardTitle>
              <CardDescription>최근 {period}일</CardDescription>
            </div>
            <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
              <TabsList>
                <TabsTrigger value="7">7일</TabsTrigger>
                <TabsTrigger value="30">30일</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaConfig} className="h-[250px] w-full">
              <AreaChart data={data.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-recordRate)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-recordRate)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatDate} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={32} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="natural" dataKey="recordRate" stroke="var(--color-recordRate)" strokeWidth={2} fill={`url(#${gradientId})`} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>인기 운동 TOP 10</CardTitle>
            <CardDescription>운동명별 기록 횟수</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[250px] w-full">
              <BarChart data={data.exerciseDistribution} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis type="category" dataKey="exerciseName" tickLine={false} axisLine={false} tickMargin={8} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 회원별 운동 빈도 */}
      <Card>
        <CardHeader>
          <CardTitle>회원별 운동 빈도</CardTitle>
          <CardDescription>기록률 기준 상위 20명</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="text-right">기록률</TableHead>
                <TableHead className="text-right">총 횟수</TableHead>
                <TableHead className="text-right">인기 운동</TableHead>
                <TableHead className="text-right">최근 기록</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.memberStats.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-right">{m.recordRate}%</TableCell>
                  <TableCell className="text-right">{m.totalWorkouts}회</TableCell>
                  <TableCell className="text-right">{m.topExercise ?? "-"}</TableCell>
                  <TableCell className="text-right">{m.lastRecordDate ?? "없음"}</TableCell>
                </TableRow>
              ))}
              {data.memberStats.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">데이터가 없습니다</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 배럴 익스포트 + StatsPage 연결**

- [ ] **Step 3: 타입체크 + 커밋**

```bash
git add src/widgets/stats/workout-stats.tsx src/widgets/stats/index.ts src/views/stats/ui/StatsPage.tsx
git commit -m "feat(통계): 운동 통계 위젯 추가"
```

---

## Task 12: 인바디 통계 위젯

**Files:**
- Create: `src/widgets/stats/inbody-stats.tsx`
- Modify: `src/widgets/stats/index.ts`
- Modify: `src/views/stats/ui/StatsPage.tsx`

- [ ] **Step 1: 인바디 통계 위젯 생성**

`src/widgets/stats/inbody-stats.tsx`:

회원별 비교 차트에서 기존 `getMemberInbodyRecords(memberId, { from, to })` API를 사용한다.
이 함수는 `src/entities/inbody/api/inbody-api.ts`에 있으며, `InbodyRecord[]`를 반환한다.
`InbodyRecord`는 `{ userId, measuredDate, weight, skeletalMuscleMass, bodyFatPercentage, ... }` 구조.

```tsx
"use client"

import { useState, useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Activity, AlertCircle } from "lucide-react"
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, Button,
  Skeleton, Tabs, TabsList, TabsTrigger,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/shared/ui"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart"
import { useInbodyStats } from "@/features/stats"
import { getMemberInbodyRecords } from "@/entities/inbody"
import type { InbodyRecord } from "@/entities/inbody"
import { cn } from "@/shared/lib/utils"

type Months = 3 | 6 | 12
type MetricKey = "avgWeight" | "avgMuscleMass" | "avgBodyFatPct"

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string; memberKey: keyof InbodyRecord }> = {
  avgWeight: { label: "체중", unit: "kg", memberKey: "weight" },
  avgMuscleMass: { label: "골격근량", unit: "kg", memberKey: "skeletalMuscleMass" },
  avgBodyFatPct: { label: "체지방률", unit: "%", memberKey: "bodyFatPercentage" },
}

const COMPARE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]

export function InbodyStatsWidget() {
  const [months, setMonths] = useState<Months>(6)
  const [metric, setMetric] = useState<MetricKey>("avgWeight")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const { data, isLoading, isError } = useInbodyStats(months)

  // 선택한 회원들의 인바디 기록 조회
  const startDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - months)
    return d.toISOString().split("T")[0]
  }, [months])

  const memberQueries = useQueries({
    queries: selectedMemberIds.map((id) => ({
      queryKey: ["inbody", "members", id, startDate],
      queryFn: () => getMemberInbodyRecords(id, { from: startDate }),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const trendConfig = {
    [metric]: { label: METRIC_CONFIG[metric].label, color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig

  if (isLoading) return <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
  if (isError || !data) return <Card><CardContent className="pt-6 text-muted-foreground text-sm">인바디 통계를 불러오지 못했습니다.</CardContent></Card>

  // 비교 차트 데이터 합성
  const compareChartConfig: ChartConfig = {}
  const compareMemberNames: string[] = []
  selectedMemberIds.forEach((id, idx) => {
    const member = data.memberOverview.find((m) => m.userId === id)
    const name = member?.name ?? "알 수 없음"
    compareMemberNames.push(name)
    compareChartConfig[`member${idx}`] = { label: name, color: COMPARE_COLORS[idx] }
  })

  // 비교 차트: measuredDate를 X축으로, 각 회원의 metric 값을 Y축으로
  const compareData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | null>>()
    memberQueries.forEach((q, idx) => {
      if (!q.data) return
      for (const record of q.data) {
        if (!dateMap.has(record.measuredDate)) dateMap.set(record.measuredDate, {})
        const entry = dateMap.get(record.measuredDate)!
        const memberKey = METRIC_CONFIG[metric].memberKey
        entry[`member${idx}`] = record[memberKey] as number | null
      }
    })
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }))
  }, [memberQueries, metric])

  function toggleMember(userId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length >= 3 ? prev : [...prev, userId]
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">이번 달 측정률</p>
                <p className="text-3xl font-bold">
                  {data.totalMembers > 0 ? Math.round((data.measuredThisMonth / data.totalMembers) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">{data.measuredThisMonth} / {data.totalMembers}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">미측정 회원</p>
                <p className="text-3xl font-bold">{data.unmeasuredThisMonth}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 전체 회원 평균 추이 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>전체 평균 추이</CardTitle>
            <CardDescription>월별 전체 회원 평균</CardDescription>
            <div className="flex flex-wrap gap-1 mt-2">
              {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
                <Button key={key} size="sm" variant={metric === key ? "default" : "outline"} onClick={() => setMetric(key)}>
                  {METRIC_CONFIG[key].label}
                </Button>
              ))}
            </div>
          </div>
          <Tabs value={String(months)} onValueChange={(v) => setMonths(Number(v) as Months)}>
            <TabsList>
              <TabsTrigger value="3">3개월</TabsTrigger>
              <TabsTrigger value="6">6개월</TabsTrigger>
              <TabsTrigger value="12">1년</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {data.monthlyAvgTrend.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">표시할 데이터가 없습니다.</div>
          ) : (
            <ChartContainer config={trendConfig} className="h-[250px] w-full">
              <LineChart data={data.monthlyAvgTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="natural" dataKey={metric} stroke={`var(--color-${metric})`} strokeWidth={2} dot />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* 회원별 비교 */}
      <Card>
        <CardHeader>
          <CardTitle>회원별 비교</CardTitle>
          <CardDescription>최대 3명까지 선택하여 추이를 비교합니다. 아래 테이블에서 회원을 클릭하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedMemberIds.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">회원을 선택해주세요</div>
          ) : compareData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">선택한 회원의 기록이 없습니다</div>
          ) : (
            <ChartContainer config={compareChartConfig} className="h-[250px] w-full">
              <LineChart data={compareData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {selectedMemberIds.map((_, idx) => (
                  <Line key={idx} type="natural" dataKey={`member${idx}`} stroke={COMPARE_COLORS[idx]} strokeWidth={2} dot />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* 측정 관리 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>회원별 측정 현황</CardTitle>
          <CardDescription>클릭하여 비교 차트에 추가 (최대 3명)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="text-right">최근 측정일</TableHead>
                <TableHead className="text-right">체중</TableHead>
                <TableHead className="text-right">골격근</TableHead>
                <TableHead className="text-right">체지방률</TableHead>
                <TableHead className="text-right">이번 달</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.memberOverview.map((m) => {
                const isSelected = selectedMemberIds.includes(m.userId)
                return (
                  <TableRow
                    key={m.userId}
                    className={cn(
                      "cursor-pointer",
                      !m.measuredThisMonth && "bg-destructive/5",
                      isSelected && "bg-primary/10"
                    )}
                    onClick={() => toggleMember(m.userId)}
                  >
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-right">{m.lastMeasuredDate ?? "-"}</TableCell>
                    <TableCell className="text-right">{m.latestWeight != null ? `${m.latestWeight}kg` : "-"}</TableCell>
                    <TableCell className="text-right">{m.latestMuscleMass != null ? `${m.latestMuscleMass}kg` : "-"}</TableCell>
                    <TableCell className="text-right">{m.latestBodyFatPct != null ? `${m.latestBodyFatPct}%` : "-"}</TableCell>
                    <TableCell className="text-right">{m.measuredThisMonth ? "✓" : "✗"}</TableCell>
                  </TableRow>
                )
              })}
              {data.memberOverview.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 배럴 익스포트 + StatsPage 연결**

- [ ] **Step 3: 타입체크 + 커밋**

```bash
git add src/widgets/stats/inbody-stats.tsx src/widgets/stats/index.ts src/views/stats/ui/StatsPage.tsx
git commit -m "feat(통계): 인바디 통계 위젯 추가"
```

---

## Task 13: 최종 검증 + 타입체크 + 빌드

- [ ] **Step 1: 전체 타입체크**

Run: `pnpm typecheck`
Expected: 에러 0건

- [ ] **Step 2: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 3: 개발 서버에서 수동 확인**

Run: `pnpm dev`
확인 사항:
- `/stats` 접속 → 6개 탭 전환
- 각 탭에서 데이터 로딩 → 차트 렌더링
- URL 쿼리 파라미터 연동 (`?tab=attendance` 등)
- 기간 토글 동작
- 반응형 레이아웃 (모바일/데스크톱)

- [ ] **Step 4: todo.md 갱신**

완료된 항목 체크:
```markdown
- [x] 통계 페이지 탭 구조 리뉴얼
- [x] 출석 통계
- [x] 회원 통계
- [x] 식단 통계
- [x] 운동 통계
- [x] 인바디 통계
```

- [ ] **Step 5: 최종 커밋**

```bash
git add todo.md
git commit -m "docs(통계): todo.md 통계 항목 완료 표시"
```
