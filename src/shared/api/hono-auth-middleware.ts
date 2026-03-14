import { createMiddleware } from "hono/factory"
import { createClient } from "@supabase/supabase-js"

// Hono Context에 user 타입 추가
export type AuthEnv = {
  Variables: {
    userId: string
    userRole: string
  }
}

// 활동 추적 throttle (5분)
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000
const lastActivityUpdate = new Map<string, number>()

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

  // 활동 추적 (X-Device-Id 헤더가 있을 때만)
  const deviceId = c.req.header("X-Device-Id")
  if (deviceId) {
    const cacheKey = `${user.id}:${deviceId}`
    const now = Date.now()
    const lastUpdate = lastActivityUpdate.get(cacheKey) ?? 0

    if (now - lastUpdate > ACTIVITY_THROTTLE_MS) {
      if (lastActivityUpdate.size > 10000) {
        lastActivityUpdate.clear()
      }
      lastActivityUpdate.set(cacheKey, now)
      // 비동기로 갱신 (응답 지연 방지)
      supabase
        .from("user_devices")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", deviceId)
        .eq("user_id", user.id)
        .then(() => {})
    }
  }

  await next()
})
