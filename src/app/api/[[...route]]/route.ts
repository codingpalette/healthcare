import { Hono } from "hono"
import { handle } from "hono/vercel"
import { createClient } from "@supabase/supabase-js"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { authMiddleware } from "@/shared/api/hono-auth-middleware"
import { resolveEmail } from "@/shared/lib/resolve-email"
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/shared/api/r2"

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

  // phone, trainer_id 업데이트
  const userId = c.get("userId")
  const profileUpdate: Record<string, unknown> = { trainer_id: userId }
  if (body.phone) profileUpdate.phone = body.phone

  await adminSupabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", authData.user.id)

  // 생성된 프로필 조회
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single()

  if (profileError) return c.json({ error: profileError.message }, 400)
  return c.json(profile, 201)
})

// 유저 목록 조회 (트레이너 전용)
profiles.get("/members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  // auth.users에서 email 조회 후 profiles와 join
  const { data: authData } = await adminSupabase.auth.admin.listUsers()
  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null])
  )

  const merged = (data ?? []).map((row) => ({
    ...row,
    email: emailMap.get(row.id) ?? null,
  }))

  return c.json(merged)
})

// 본인 프로필 수정
profiles.patch("/me", async (c) => {
  const userId = c.get("userId")

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
    .eq("id", userId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 아바타 업로드
profiles.post("/me/avatar", async (c) => {
  const userId = c.get("userId")

  const formData = await c.req.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return c.json({ error: "파일이 필요합니다" }, 400)
  }

  // 이미지 타입 검증
  if (!file.type.startsWith("image/")) {
    return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
  }

  // 5MB 크기 제한
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "파일 크기는 5MB 이하여야 합니다" }, 400)
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const key = `avatars/${userId}/${Date.now()}.${ext}`

  // R2에 업로드
  const arrayBuffer = await file.arrayBuffer()
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    })
  )

  const avatarUrl = `${R2_PUBLIC_URL}/${key}`

  // 기존 아바타 삭제
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existing } = await adminSupabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single()

  if (existing?.avatar_url) {
    const oldKey = existing.avatar_url.replace(`${R2_PUBLIC_URL}/`, "")
    try {
      await r2Client.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey })
      )
    } catch {
      // 기존 파일 삭제 실패는 무시
    }
  }

  // DB 업데이트
  const { error } = await adminSupabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ avatarUrl })
})

// 내 회원 목록 조회 (트레이너 전용)
profiles.get("/my-members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("trainer_id", userId)
    .eq("role", "member")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  const { data: authData } = await adminSupabase.auth.admin.listUsers()
  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? null])
  )

  const merged = (data ?? []).map((row) => ({
    ...row,
    email: emailMap.get(row.id) ?? null,
  }))

  return c.json(merged)
})

// 트레이너 배정 (트레이너 전용)
profiles.patch("/:id/assign-trainer", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 배정할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const targetId = c.req.param("id")
  const body = await c.req.json<{ trainerId?: string }>()

  // 본인 ID만 trainerId로 허용
  if (body.trainerId !== userId) {
    return c.json({ error: "본인만 트레이너로 배정할 수 있습니다" }, 403)
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 대상이 member이고 삭제되지 않았는지 검증
  const { data: target, error: targetError } = await adminSupabase
    .from("profiles")
    .select("role, deleted_at")
    .eq("id", targetId)
    .single()

  if (targetError || !target) {
    return c.json({ error: "대상 회원을 찾을 수 없습니다" }, 404)
  }
  if (target.role !== "member") {
    return c.json({ error: "회원만 트레이너에 배정할 수 있습니다" }, 400)
  }
  if (target.deleted_at) {
    return c.json({ error: "삭제된 회원은 배정할 수 없습니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ trainer_id: userId })
    .eq("id", targetId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 트레이너 해제 (트레이너 전용)
profiles.patch("/:id/unassign-trainer", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 해제할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const targetId = c.req.param("id")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 본인에게 배정된 회원만 해제 가능
  const { data: target, error: targetError } = await adminSupabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", targetId)
    .single()

  if (targetError || !target) {
    return c.json({ error: "대상 회원을 찾을 수 없습니다" }, 404)
  }
  if (target.trainer_id !== userId) {
    return c.json({ error: "본인에게 배정된 회원만 해제할 수 있습니다" }, 403)
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ trainer_id: null })
    .eq("id", targetId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 프로필 수정 (트레이너용)
profiles.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const targetId = c.req.param("id")

  const userRole = c.get("userRole")

  // 본인 수정 OR 트레이너가 회원 수정
  if (userId !== targetId) {
    if (userRole !== "trainer") {
      return c.json({ error: "본인의 프로필만 수정할 수 있습니다" }, 403)
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

// 권한 변경 (본인 제외)
profiles.patch("/:id/role", async (c) => {
  const userId = c.get("userId")
  const targetId = c.req.param("id")

  if (userId === targetId) {
    return c.json({ error: "본인의 권한은 변경할 수 없습니다" }, 403)
  }

  const body = await c.req.json<{ role?: string }>()
  if (!body.role || !["member", "trainer"].includes(body.role)) {
    return c.json({ error: "올바른 권한을 지정해주세요 (member 또는 trainer)" }, 400)
  }

  // Service Role 키로 Admin 클라이언트 생성 (RLS 우회)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ role: body.role })
    .eq("id", targetId)
    .is("deleted_at", null)
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

// 출석 관리 라우트
const attendance = new Hono().use(authMiddleware)

// 체크인
attendance.post("/check-in", async (c) => {
  const userId = c.get("userId")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 오늘 체크인 후 체크아웃 안 한 레코드 확인
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existing } = await adminSupabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .gte("check_in_at", todayStart.toISOString())
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

// 체크아웃
attendance.patch("/check-out", async (c) => {
  const userId = c.get("userId")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: existing } = await adminSupabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .gte("check_in_at", todayStart.toISOString())
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

// 내 출석 기록 조회
attendance.get("/me", async (c) => {
  const userId = c.get("userId")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 기본값: 이번 달
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

// 오늘 전체 출석 기록 조회 (트레이너 전용)
attendance.get("/today", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await adminSupabase
    .from("attendance")
    .select("*, profiles!inner(name)")
    .gte("check_in_at", todayStart.toISOString())
    .order("check_in_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  // profiles join 결과를 flat하게 변환
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

// 특정 회원의 출석 기록 조회 (트레이너 전용)
attendance.get("/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const memberId = c.req.param("id")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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

app.route("/attendance", attendance)

// 식단 관리 라우트
const diet = new Hono().use(authMiddleware)

// 식단 생성 (사진 업로드 포함)
diet.post("/", async (c) => {
  const userId = c.get("userId")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const contentType = c.req.header("Content-Type") ?? ""
  let mealType: string | undefined
  let description: string | undefined
  let calories: string | undefined
  let carbs: string | undefined
  let protein: string | undefined
  let fat: string | undefined
  let date: string | undefined
  let photoUrl: string | undefined

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const file = formData.get("file")

    if (file && file instanceof File) {
      // 이미지 타입 검증
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      // 10MB 크기 제한
      if (file.size > 10 * 1024 * 1024) {
        return c.json({ error: "파일 크기는 10MB 이하여야 합니다" }, 400)
      }

      const ext = file.name.split(".").pop() ?? "jpg"
      const key = `meals/${userId}/${Date.now()}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: new Uint8Array(arrayBuffer),
          ContentType: file.type,
        })
      )
      photoUrl = `${R2_PUBLIC_URL}/${key}`
    }

    mealType = formData.get("mealType") as string | undefined
    description = formData.get("description") as string | undefined
    calories = formData.get("calories") as string | undefined
    carbs = formData.get("carbs") as string | undefined
    protein = formData.get("protein") as string | undefined
    fat = formData.get("fat") as string | undefined
    date = formData.get("date") as string | undefined
  } else {
    const body = await c.req.json<{
      mealType?: string
      description?: string
      calories?: number
      carbs?: number
      protein?: number
      fat?: number
      date?: string
    }>()
    mealType = body.mealType
    description = body.description
    calories = body.calories != null ? String(body.calories) : undefined
    carbs = body.carbs != null ? String(body.carbs) : undefined
    protein = body.protein != null ? String(body.protein) : undefined
    fat = body.fat != null ? String(body.fat) : undefined
    date = body.date
  }

  if (!mealType || !["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
    return c.json({ error: "올바른 식사 유형을 선택해주세요" }, 400)
  }

  const insertData: Record<string, unknown> = {
    user_id: userId,
    meal_type: mealType,
  }
  if (description) insertData.description = description
  if (calories) insertData.calories = Number(calories)
  if (carbs) insertData.carbs = Number(carbs)
  if (protein) insertData.protein = Number(protein)
  if (fat) insertData.fat = Number(fat)
  if (photoUrl) insertData.photo_url = photoUrl
  if (date) insertData.date = date

  const { data, error } = await adminSupabase
    .from("meals")
    .insert(insertData)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

// 내 식단 조회
diet.get("/me", async (c) => {
  const userId = c.get("userId")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")

  let query = adminSupabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (fromParam) query = query.gte("date", fromParam)
  if (toParam) query = query.lte("date", toParam)

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 오늘 전체 식단 조회 (트레이너 전용)
diet.get("/today", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await adminSupabase
    .from("meals")
    .select("*, profiles!inner(name)")
    .eq("date", today)
    .order("created_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  // profiles join 결과를 flat하게 변환
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

// 특정 회원 식단 조회 (트레이너 전용)
diet.get("/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const memberId = c.req.param("id")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")

  let query = adminSupabase
    .from("meals")
    .select("*")
    .eq("user_id", memberId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (fromParam) query = query.gte("date", fromParam)
  if (toParam) query = query.lte("date", toParam)

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 식단 수정
diet.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const mealId = c.req.param("id")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 본인 식단인지 확인
  const { data: existing } = await adminSupabase
    .from("meals")
    .select("id, user_id, photo_url")
    .eq("id", mealId)
    .single()

  if (!existing) return c.json({ error: "식단을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) return c.json({ error: "본인의 식단만 수정할 수 있습니다" }, 403)

  const contentType = c.req.header("Content-Type") ?? ""
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const file = formData.get("file")

    if (file && file instanceof File) {
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > 10 * 1024 * 1024) {
        return c.json({ error: "파일 크기는 10MB 이하여야 합니다" }, 400)
      }

      // 기존 사진 삭제
      if (existing.photo_url) {
        const oldKey = (existing.photo_url as string).replace(`${R2_PUBLIC_URL}/`, "")
        try {
          await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }))
        } catch {
          // 기존 파일 삭제 실패는 무시
        }
      }

      const ext = file.name.split(".").pop() ?? "jpg"
      const key = `meals/${userId}/${Date.now()}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: new Uint8Array(arrayBuffer),
          ContentType: file.type,
        })
      )
      updateData.photo_url = `${R2_PUBLIC_URL}/${key}`
    }

    const mealType = formData.get("mealType") as string | null
    const description = formData.get("description") as string | null
    const calories = formData.get("calories") as string | null
    const carbs = formData.get("carbs") as string | null
    const protein = formData.get("protein") as string | null
    const fat = formData.get("fat") as string | null
    const date = formData.get("date") as string | null

    if (mealType) updateData.meal_type = mealType
    if (description) updateData.description = description
    if (calories) updateData.calories = Number(calories)
    if (carbs) updateData.carbs = Number(carbs)
    if (protein) updateData.protein = Number(protein)
    if (fat) updateData.fat = Number(fat)
    if (date) updateData.date = date
  } else {
    const body = await c.req.json<Record<string, unknown>>()
    if (body.mealType) updateData.meal_type = body.mealType
    if (body.description !== undefined) updateData.description = body.description
    if (body.calories !== undefined) updateData.calories = body.calories
    if (body.carbs !== undefined) updateData.carbs = body.carbs
    if (body.protein !== undefined) updateData.protein = body.protein
    if (body.fat !== undefined) updateData.fat = body.fat
    if (body.date) updateData.date = body.date
  }

  const { data, error } = await adminSupabase
    .from("meals")
    .update(updateData)
    .eq("id", mealId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 식단 삭제
diet.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const mealId = c.req.param("id")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 본인 식단인지 확인
  const { data: existing } = await adminSupabase
    .from("meals")
    .select("id, user_id, photo_url")
    .eq("id", mealId)
    .single()

  if (!existing) return c.json({ error: "식단을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) return c.json({ error: "본인의 식단만 삭제할 수 있습니다" }, 403)

  // R2 사진 삭제
  if (existing.photo_url) {
    const oldKey = (existing.photo_url as string).replace(`${R2_PUBLIC_URL}/`, "")
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }))
    } catch {
      // 기존 파일 삭제 실패는 무시
    }
  }

  const { error } = await adminSupabase
    .from("meals")
    .delete()
    .eq("id", mealId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

app.route("/diet", diet)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
