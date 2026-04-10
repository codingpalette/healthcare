import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/app/api/_lib/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { getAutoCheckoutAt, getKstDateRange, getKstMonthRange, getTodayKstDateString } from "@/shared/lib/attendance-date"

export const attendanceRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)

function parseTargetDate(dateParam: string | undefined) {
  return dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : getTodayKstDateString()
}

async function closeExpiredAttendance(params: {
  adminSupabase: ReturnType<typeof createAdminSupabase>
  todayStart: string
  userId?: string
}) {
  let query = params.adminSupabase
    .from("attendance")
    .select("id, check_in_at")
    .is("check_out_at", null)
    .lt("check_in_at", params.todayStart)

  if (params.userId) {
    query = query.eq("user_id", params.userId)
  }

  const { data, error } = await query

  if (error) return { error, closedCount: 0 }

  const expiredRows = (data ?? []) as { id: string; check_in_at: string }[]
  if (expiredRows.length === 0) return { closedCount: 0 }

  const results = await Promise.all(
    expiredRows.map((row) =>
      params.adminSupabase
        .from("attendance")
        .update({ check_out_at: getAutoCheckoutAt(row.check_in_at) })
        .eq("id", row.id)
    )
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) return { error: failed.error, closedCount: 0 }

  return { closedCount: expiredRows.length }
}

attendanceRoutes.post("/check-in", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const { start } = getKstDateRange(getTodayKstDateString())

  const cleanupResult = await closeExpiredAttendance({
    adminSupabase,
    todayStart: start,
    userId,
  })
  if (cleanupResult.error) return c.json({ error: cleanupResult.error.message }, 400)

  const { data: existing, error: existingError } = await adminSupabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .gte("check_in_at", start)
    .is("check_out_at", null)
    .limit(1)
    .maybeSingle()

  if (existingError) return c.json({ error: existingError.message }, 400)

  if (existing) {
    return c.json({ error: "이미 체크인 상태입니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("attendance")
    .insert({ user_id: userId })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

attendanceRoutes.patch("/check-out", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const now = new Date().toISOString()
  const { start } = getKstDateRange(getTodayKstDateString())

  const cleanupResult = await closeExpiredAttendance({
    adminSupabase,
    todayStart: start,
    userId,
  })
  if (cleanupResult.error) return c.json({ error: cleanupResult.error.message }, 400)

  const { data: activeRows, error: activeRowsError } = await adminSupabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .gte("check_in_at", start)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })

  if (activeRowsError) return c.json({ error: activeRowsError.message }, 400)

  if (!activeRows?.length) {
    return c.json({
      error: cleanupResult.closedCount > 0
        ? "이전 날짜 출석은 23:59:59에 자동 종료되었습니다. 오늘 체크인 기록이 없습니다"
        : "체크인 기록이 없습니다",
    }, 400)
  }

  const activeIds = activeRows.map((row) => row.id as string)
  const { error } = await adminSupabase
    .from("attendance")
    .update({ check_out_at: now })
    .in("id", activeIds)

  if (error) return c.json({ error: error.message }, 400)

  const { data, error: fetchError } = await adminSupabase
    .from("attendance")
    .select("*")
    .eq("id", activeIds[0])
    .single()

  if (fetchError) return c.json({ error: fetchError.message }, 400)
  return c.json(data)
})

attendanceRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const { start } = getKstDateRange(getTodayKstDateString())
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")
  const monthRange = getKstMonthRange()
  const from = fromParam ?? monthRange.from
  const to = toParam ?? monthRange.to

  const cleanupResult = await closeExpiredAttendance({
    adminSupabase,
    todayStart: start,
    userId,
  })
  if (cleanupResult.error) return c.json({ error: cleanupResult.error.message }, 400)

  const { data, error } = await adminSupabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .gte("check_in_at", from)
    .lte("check_in_at", to)
    .order("check_in_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

attendanceRoutes.get("/today", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createAdminSupabase()
  const { start: todayStart } = getKstDateRange(getTodayKstDateString())
  const targetDate = parseTargetDate(c.req.query("date"))
  const { start, end } = getKstDateRange(targetDate)

  const cleanupResult = await closeExpiredAttendance({
    adminSupabase,
    todayStart,
  })
  if (cleanupResult.error) return c.json({ error: cleanupResult.error.message }, 400)

  const { data, error } = await adminSupabase
    .from("attendance")
    .select("*, profiles!inner(name)")
    .gte("check_in_at", start)
    .lte("check_in_at", end)
    .order("check_in_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  const result = (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as Record<string, unknown> | null
    return {
      ...row,
      profiles: undefined,
      user_name: profiles?.name ?? "",
    }
  })

  return c.json(result)
})

attendanceRoutes.get("/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const memberId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const { start } = getKstDateRange(getTodayKstDateString())
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")
  const monthRange = getKstMonthRange()
  const from = fromParam ?? monthRange.from
  const to = toParam ?? monthRange.to

  const cleanupResult = await closeExpiredAttendance({
    adminSupabase,
    todayStart: start,
    userId: memberId,
  })
  if (cleanupResult.error) return c.json({ error: cleanupResult.error.message }, 400)

  const { data, error } = await adminSupabase
    .from("attendance")
    .select("*")
    .eq("user_id", memberId)
    .gte("check_in_at", from)
    .lte("check_in_at", to)
    .order("check_in_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})
