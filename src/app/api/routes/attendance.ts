import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/app/api/_lib/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

export const attendanceRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)

function getTodayDateString() {
  return new Date().toISOString().split("T")[0]
}

function getDateRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+09:00`).toISOString(),
    end: new Date(`${date}T23:59:59.999+09:00`).toISOString(),
  }
}

function parseTargetDate(dateParam: string | undefined) {
  return dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : getTodayDateString()
}

attendanceRoutes.post("/check-in", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const { start } = getDateRange(getTodayDateString())

  const { data: existing } = await adminSupabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .gte("check_in_at", start)
    .is("check_out_at", null)
    .limit(1)
    .single()

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
  const { start } = getDateRange(getTodayDateString())

  const { data: existing } = await adminSupabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .gte("check_in_at", start)
    .is("check_out_at", null)
    .limit(1)
    .single()

  if (!existing) {
    return c.json({ error: "체크인 기록이 없습니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("attendance")
    .update({ check_out_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

attendanceRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const now = new Date()
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")
  const from = fromParam ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = toParam ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

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
  const targetDate = parseTargetDate(c.req.query("date"))
  const { start, end } = getDateRange(targetDate)

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
  const now = new Date()
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")
  const from = fromParam ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = toParam ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

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
