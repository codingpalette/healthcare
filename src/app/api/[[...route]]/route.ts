import { Hono } from "hono"
import { handle } from "hono/vercel"
import { createClient } from "@supabase/supabase-js"
import { authMiddleware } from "@/shared/api/hono-auth-middleware"
import { resolveEmail } from "@/shared/lib/resolve-email"

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

// 회원 생성 (트레이너 전용)
profiles.post("/members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 회원을 생성할 수 있습니다" }, 403)
  }

  const body = await c.req.json<{
    email?: string
    password?: string
    name?: string
    phone?: string
  }>()

  // 이메일 변환 및 유효성 검증
  const email = body.email ? resolveEmail(body.email) : ""
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "올바른 이메일 형식이 필요합니다" }, 400)
  }
  if (!body.password || body.password.length < 6) {
    return c.json({ error: "비밀번호는 6자 이상이어야 합니다" }, 400)
  }
  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: "이름은 필수입니다" }, 400)
  }

  // Service Role 키로 Admin 클라이언트 생성
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 사용자 생성
  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, role: "member" },
    })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return c.json({ error: "이미 등록된 이메일입니다" }, 409)
    }
    return c.json({ error: authError.message }, 400)
  }

  // phone이 있으면 프로필 업데이트
  if (body.phone) {
    await adminSupabase
      .from("profiles")
      .update({ phone: body.phone })
      .eq("id", authData.user.id)
  }

  // 생성된 프로필 조회
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single()

  if (profileError) return c.json({ error: profileError.message }, 400)
  return c.json(profile, 201)
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

  const userRole = c.get("userRole")

  // 본인 수정 OR 트레이너가 회원 수정
  if (userId !== targetId) {
    if (userRole !== "trainer") {
      return c.json({ error: "본인의 프로필만 수정할 수 있습니다" }, 403)
    }

    // 트레이너는 회원만 수정 가능
    const supabaseCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: { Authorization: c.req.header("Authorization")! },
        },
      }
    )
    const { data: targetProfile } = await supabaseCheck
      .from("profiles")
      .select("role")
      .eq("id", targetId)
      .single()

    if (targetProfile?.role !== "member") {
      return c.json({ error: "회원만 수정할 수 있습니다" }, 403)
    }
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
