import { createMiddleware } from "hono/factory"
import { createClient } from "@supabase/supabase-js"

// Hono Context에 user 타입 추가
export type AuthEnv = {
  Variables: {
    userId: string
    userRole: string
  }
}

// 활동 추적 throttle (5분) — DB 기반으로 Serverless 환경에서도 동작
const ACTIVITY_THROTTLE_MINUTES = 5

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authorization = c.req.header("Authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "인증 토큰이 필요합니다" }, 401)
  }

  const token = authorization.slice(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return c.json({ error: "유효하지 않은 토큰입니다" }, 401)
  }

  // 프로필에서 역할 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  c.set("userId", user.id)
  c.set("userRole", profile?.role ?? "member")

  // 활동 추적 (X-Device-Id 헤더가 있을 때만, DB 기반 throttle)
  const deviceId = c.req.header("X-Device-Id")
  if (deviceId) {
    // DB에서 last_active_at 확인하여 5분 이내면 갱신 스킵
    supabase
      .from("user_devices")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", deviceId)
      .eq("user_id", user.id)
      .lt("last_active_at", new Date(Date.now() - ACTIVITY_THROTTLE_MINUTES * 60 * 1000).toISOString())
      .then(() => {})
  }

  await next()
})
