import { createMiddleware } from "hono/factory"
import { createClient } from "@supabase/supabase-js"

// Hono Context에 user 타입 추가
export type AuthEnv = {
  Variables: {
    userId: string
    userRole: string
  }
}

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

  await next()
})
