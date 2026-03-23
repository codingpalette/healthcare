import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/shared/api/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { uploadPublicFile } from "@/app/api/_lib/r2-storage"
import { sendPushNotifications } from "@/app/api/_lib/web-push"

export const noticesRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

// 공지사항 목록 조회
noticesRoutes.get("/", async (c) => {
  const adminSupabase = createAdminSupabase()
  const category = c.req.query("category")
  const search = c.req.query("search")
  const page = Math.max(1, Number(c.req.query("page") ?? "1"))
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "20")))
  const offset = (page - 1) * limit

  let query = adminSupabase
    .from("notices")
    .select("*, profiles!author_id(name)", { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) {
    query = query.eq("category", category)
  }

  if (search && search.length >= 2) {
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
    query = query.ilike("title", `%${escapedSearch}%`)
  }

  const { data, error, count } = await query
  if (error) return c.json({ error: error.message }, 400)

  return c.json({ data: data ?? [], total: count ?? 0 })
})

// 이미지 업로드 (트레이너 전용) — /:id 라우트보다 먼저 정의해야 함
noticesRoutes.post("/images", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 이미지를 업로드할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const formData = await c.req.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return c.json({ error: "파일을 업로드해주세요" }, 400)
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return c.json({ error: "JPEG, PNG, WebP 이미지만 업로드할 수 있습니다" }, 400)
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
  }

  const uploaded = await uploadPublicFile({ file, folder: "notices", ownerId: userId })
  return c.json({ url: uploaded.publicUrl }, 201)
})

// 공지사항 상세 조회
noticesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data, error } = await adminSupabase
    .from("notices")
    .select("*, profiles!author_id(name)")
    .eq("id", id)
    .single()

  if (error) return c.json({ error: error.message }, 400)
  if (!data) return c.json({ error: "공지사항을 찾을 수 없습니다" }, 404)

  return c.json(data)
})

// 공지사항 생성 (트레이너 전용)
noticesRoutes.post("/", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 공지사항을 작성할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{
    title?: string
    content?: Record<string, unknown>
    category?: string
    isPinned?: boolean
  }>()

  if (!body.title?.trim()) {
    return c.json({ error: "제목을 입력해주세요" }, 400)
  }
  if (!body.content || typeof body.content !== "object") {
    return c.json({ error: "내용을 입력해주세요" }, 400)
  }

  const validCategories = ["general", "important", "event"]
  if (body.category && !validCategories.includes(body.category)) {
    return c.json({ error: "유효하지 않은 카테고리입니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("notices")
    .insert({
      title: body.title.trim(),
      content: body.content,
      category: body.category ?? "general",
      is_pinned: body.isPinned ?? false,
      author_id: userId,
    })
    .select("*, profiles!author_id(name)")
    .single()

  if (error) return c.json({ error: error.message }, 400)

  // 비동기 벌크 알림 발송 (fire-and-forget)
  sendNoticeNotifications(adminSupabase, data.id as string, body.title.trim()).catch(() => {})

  return c.json(data, 201)
})

// 공지사항 수정 (트레이너 전용)
noticesRoutes.patch("/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 공지사항을 수정할 수 있습니다" }, 403)
  }

  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{
    title?: string
    content?: Record<string, unknown>
    category?: string
    isPinned?: boolean
  }>()

  const validCategories = ["general", "important", "event"]
  if (body.category && !validCategories.includes(body.category)) {
    return c.json({ error: "유효하지 않은 카테고리입니다" }, 400)
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.content !== undefined) updateData.content = body.content
  if (body.category !== undefined) updateData.category = body.category
  if (body.isPinned !== undefined) updateData.is_pinned = body.isPinned

  const { data, error } = await adminSupabase
    .from("notices")
    .update(updateData)
    .eq("id", id)
    .select("*, profiles!author_id(name)")
    .single()

  if (error) return c.json({ error: error.message }, 400)

  return c.json(data)
})

// 공지사항 삭제 (트레이너 전용)
noticesRoutes.delete("/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 공지사항을 삭제할 수 있습니다" }, 403)
  }

  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { error } = await adminSupabase.from("notices").delete().eq("id", id)
  if (error) return c.json({ error: error.message }, 400)

  return c.json({ success: true })
})

// 공지사항 벌크 알림 발송 헬퍼
async function sendNoticeNotifications(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  noticeId: string,
  noticeTitle: string
) {
  // 모든 회원 조회
  const { data: members } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .is("deleted_at", null)

  if (!members?.length) return

  // 공지 알림 비활성화한 회원 제외
  const { data: optedOut } = await adminSupabase
    .from("notification_preferences")
    .select("user_id")
    .eq("notice_enabled", false)

  const optedOutIds = new Set((optedOut ?? []).map((row) => row.user_id as string))

  // 알림 받을 회원 필터링
  const recipients = members.filter((m) => !optedOutIds.has(m.id as string))
  if (!recipients.length) return

  // 벌크 알림 insert (dedupe_key로 중복 방지)
  const now = new Date().toISOString()
  const notifications = recipients.map((m) => ({
    recipient_id: m.id as string,
    kind: "notice" as const,
    title: "새 공지사항이 등록되었습니다",
    message: noticeTitle,
    link: `/notices/${noticeId}`,
    metadata: { noticeId },
    dedupe_key: `notice-${noticeId}-${m.id as string}`,
    scheduled_for: now,
    updated_at: now,
  }))

  // 이미 존재하는 dedupe_key 조회
  const dedupeKeys = notifications.map((n) => n.dedupe_key)
  const { data: existing } = await adminSupabase
    .from("notifications")
    .select("dedupe_key")
    .in("dedupe_key", dedupeKeys)

  const existingKeys = new Set((existing ?? []).map((row) => row.dedupe_key as string))
  const toInsert = notifications.filter((n) => !existingKeys.has(n.dedupe_key))

  if (!toInsert.length) return

  await adminSupabase.from("notifications").insert(toInsert)

  // push_enabled 회원에게 푸시 알림 발송
  const recipientIds = toInsert.map((n) => n.recipient_id)
  const { data: pushEnabled } = await adminSupabase
    .from("notification_preferences")
    .select("user_id")
    .in("user_id", recipientIds)
    .eq("push_enabled", true)

  if (!pushEnabled?.length) return

  await Promise.all(
    pushEnabled.map((row) =>
      sendPushNotifications(adminSupabase, row.user_id as string, {
        title: "새 공지사항이 등록되었습니다",
        body: noticeTitle,
        url: `/notices/${noticeId}`,
      })
    )
  )
}
