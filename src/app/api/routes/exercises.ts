import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/app/api/_lib/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { deletePublicFiles, uploadPublicFile } from "@/app/api/_lib/r2-storage"

export const exerciseRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)
const MAX_IMAGES = 5
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// 운동 항목 목록 조회
exerciseRoutes.get("/", async (c) => {
  const adminSupabase = createAdminSupabase()
  const category = c.req.query("category")
  const search = c.req.query("search")

  let query = adminSupabase
    .from("exercise_items")
    .select("*")
    .order("category")
    .order("name")

  if (category) {
    query = query.eq("category", category)
  }

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 운동 항목 상세 조회
exerciseRoutes.get("/:id", async (c) => {
  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data, error } = await adminSupabase
    .from("exercise_items")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return c.json({ error: error.message }, 400)
  if (!data) return c.json({ error: "운동 항목을 찾을 수 없습니다" }, 404)
  return c.json(data)
})

// 운동 항목 등록 (트레이너 전용)
exerciseRoutes.post("/", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 운동 항목을 등록할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const contentType = c.req.header("Content-Type") ?? ""
  const adminSupabase = createAdminSupabase()

  let name: string | undefined
  let category: string | undefined
  let description: string | undefined
  let precautions: string | undefined
  let youtubeUrl: string | undefined
  const imageUrls: string[] = []

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const files = formData.getAll("files")

    if (files.length > MAX_IMAGES) {
      return c.json({ error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` }, 400)
    }

    for (const file of files) {
      if (!(file instanceof File)) continue
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
      }
      const uploaded = await uploadPublicFile({
        file,
        folder: "exercises",
        ownerId: userId,
      })
      imageUrls.push(uploaded.publicUrl)
    }

    name = formData.get("name") as string | undefined
    category = formData.get("category") as string | undefined
    description = formData.get("description") as string | undefined
    precautions = formData.get("precautions") as string | undefined
    youtubeUrl = formData.get("youtubeUrl") as string | undefined
  } else {
    const body = await c.req.json<{
      name?: string
      category?: string
      description?: string
      precautions?: string
      youtubeUrl?: string
    }>()
    name = body.name
    category = body.category
    description = body.description
    precautions = body.precautions
    youtubeUrl = body.youtubeUrl
  }

  if (!name?.trim()) {
    return c.json({ error: "운동명을 입력해주세요" }, 400)
  }
  if (!category) {
    return c.json({ error: "카테고리를 선택해주세요" }, 400)
  }

  const insertData: Record<string, unknown> = {
    name: name.trim(),
    category,
  }
  if (description?.trim()) insertData.description = description.trim()
  if (precautions?.trim()) insertData.precautions = precautions.trim()
  if (youtubeUrl?.trim()) insertData.youtube_url = youtubeUrl.trim()
  if (imageUrls.length) insertData.image_urls = imageUrls

  const { data, error } = await adminSupabase
    .from("exercise_items")
    .insert(insertData)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

// 운동 항목 수정 (트레이너 전용)
exerciseRoutes.patch("/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 운동 항목을 수정할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const contentType = c.req.header("Content-Type") ?? ""

  const { data: existing } = await adminSupabase
    .from("exercise_items")
    .select("id, image_urls")
    .eq("id", id)
    .single()

  if (!existing) return c.json({ error: "운동 항목을 찾을 수 없습니다" }, 404)

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const files = formData.getAll("files")
    const existingUrlsRaw = formData.get("existingUrls")
    const keptUrls: string[] = existingUrlsRaw
      ? (JSON.parse(existingUrlsRaw as string) as string[])
      : []

    if (files.length + keptUrls.length > MAX_IMAGES) {
      return c.json({ error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` }, 400)
    }

    const newlyUploaded: string[] = []
    for (const file of files) {
      if (!(file instanceof File)) continue
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
      }
      const uploaded = await uploadPublicFile({
        file,
        folder: "exercises",
        ownerId: userId,
      })
      newlyUploaded.push(uploaded.publicUrl)
    }

    const existingUrls = (existing.image_urls as string[] | null) ?? []
    const urlsToDelete = existingUrls.filter((url) => !keptUrls.includes(url))
    if (urlsToDelete.length > 0) {
      await deletePublicFiles(urlsToDelete)
    }

    updateData.image_urls = [...keptUrls, ...newlyUploaded]

    const name = formData.get("name") as string | null
    const category = formData.get("category") as string | null
    const description = formData.get("description") as string | null
    const precautions = formData.get("precautions") as string | null
    const youtubeUrl = formData.get("youtubeUrl") as string | null

    if (name) updateData.name = name.trim()
    if (category) updateData.category = category
    if (description !== null) updateData.description = description?.trim() || null
    if (precautions !== null) updateData.precautions = precautions?.trim() || null
    if (youtubeUrl !== null) updateData.youtube_url = youtubeUrl?.trim() || null
  } else {
    const body = await c.req.json<Record<string, unknown>>()
    if (body.existingUrls !== undefined) {
      const keptUrls = Array.isArray(body.existingUrls) ? (body.existingUrls as string[]) : []
      const existingUrls = (existing.image_urls as string[] | null) ?? []
      const urlsToDelete = existingUrls.filter((url) => !keptUrls.includes(url))
      if (urlsToDelete.length > 0) {
        await deletePublicFiles(urlsToDelete)
      }
      updateData.image_urls = keptUrls
    }
    if (body.name) updateData.name = (body.name as string).trim()
    if (body.category) updateData.category = body.category
    if (body.description !== undefined) updateData.description = (body.description as string)?.trim() || null
    if (body.precautions !== undefined) updateData.precautions = (body.precautions as string)?.trim() || null
    if (body.youtubeUrl !== undefined) updateData.youtube_url = (body.youtubeUrl as string)?.trim() || null
  }

  const { data, error } = await adminSupabase
    .from("exercise_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// 운동 항목 삭제 (트레이너 전용)
exerciseRoutes.delete("/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 운동 항목을 삭제할 수 있습니다" }, 403)
  }

  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: existing } = await adminSupabase
    .from("exercise_items")
    .select("id, image_urls")
    .eq("id", id)
    .single()

  if (!existing) return c.json({ error: "운동 항목을 찾을 수 없습니다" }, 404)

  const urlsToDelete = (existing.image_urls as string[] | null) ?? []
  if (urlsToDelete.length > 0) {
    await deletePublicFiles(urlsToDelete)
  }

  const { error } = await adminSupabase
    .from("exercise_items")
    .delete()
    .eq("id", id)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
