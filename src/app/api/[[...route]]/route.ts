import { Hono } from "hono"
import { handle } from "hono/vercel"
import { createClient } from "@supabase/supabase-js"
import { authMiddleware } from "@/shared/api/hono-auth-middleware"

const app = new Hono().basePath("/api")

app.get("/health", (c) => {
  return c.json({ status: "ok" })
})

// 인증 필요 라우트
const profiles = new Hono().use(authMiddleware)

// 내 프로필 조회
profiles.get("/me", async (c) => {
  const userId = c.get("userId")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: { Authorization: c.req.header("Authorization")! },
      },
    }
  )

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 회원 목록 조회 (트레이너 전용)
profiles.get("/members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: { Authorization: c.req.header("Authorization")! },
      },
    }
  )

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 프로필 수정
profiles.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const targetId = c.req.param("id")

  if (userId !== targetId) {
    return c.json({ error: "본인의 프로필만 수정할 수 있습니다" }, 403)
  }

  const body = await c.req.json<{ name?: string; phone?: string }>()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: { Authorization: c.req.header("Authorization")! },
      },
    }
  )

  const { data, error } = await supabase
    .from("profiles")
    .update(body)
    .eq("id", targetId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 회원 soft delete (트레이너 전용)
profiles.patch("/:id/soft-delete", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 삭제할 수 있습니다" }, 403)
  }

  const targetId = c.req.param("id")

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: { Authorization: c.req.header("Authorization")! },
      },
    }
  )

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", targetId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

app.route("/profiles", profiles)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
