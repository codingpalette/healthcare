import { createMiddleware } from "hono/factory"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import type { AuthEnv } from "@/shared/api/hono-auth-middleware"

export const membershipGuardMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const userRole = c.get("userRole")

  // 트레이너는 체크 없이 통과
  if (userRole !== "member") {
    return next()
  }

  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  const { data: membership } = await adminSupabase
    .from("memberships")
    .select("end_date")
    .eq("member_id", userId)
    .maybeSingle()

  const today = new Date().toISOString().split("T")[0]

  if (!membership || membership.end_date < today) {
    return c.json({ error: "membership_expired" }, 403)
  }

  return next()
})
