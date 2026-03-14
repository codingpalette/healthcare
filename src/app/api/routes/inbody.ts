import { Hono } from "hono"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { deletePublicFile, deletePublicFiles, uploadPublicFile } from "@/app/api/_lib/r2-storage"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"

export const inbodyRoutes = new Hono<AuthEnv>().use(authMiddleware)

const MAX_INBODY_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_IMAGES = 5

function applyDateFilter<T extends {
  gte: (column: string, value: string) => T
  lte: (column: string, value: string) => T
}>(query: T, from?: string | null, to?: string | null) {
  let next = query
  if (from) next = next.gte("measured_date", from)
  if (to) next = next.lte("measured_date", to)
  return next
}

function parseNumberValue(value: string | null | undefined) {
  if (value == null) return undefined
  if (!value.trim()) return null
  return Number(value)
}

function normalizeReminderDay(value: number) {
  return Math.min(28, Math.max(1, value))
}

inbodyRoutes.post("/", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const contentType = c.req.header("Content-Type") ?? ""
  const insertData: Record<string, unknown> = {
    user_id: userId,
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)

    if (files.length > 0) {
      if (files.length > MAX_IMAGES) {
        return c.json({ error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` }, 400)
      }
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
        }
        if (file.size > MAX_INBODY_IMAGE_BYTES) {
          return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
        }
      }

      const uploadedUrls = await Promise.all(
        files.map((file) =>
          uploadPublicFile({ file, folder: "inbody", ownerId: userId }).then((r) => r.publicUrl)
        )
      )
      insertData.photo_urls = uploadedUrls
    }

    const measuredDate = formData.get("measuredDate") as string | null
    const weight = formData.get("weight") as string | null
    const skeletalMuscleMass = formData.get("skeletalMuscleMass") as string | null
    const bodyFatPercentage = formData.get("bodyFatPercentage") as string | null
    const bodyMassIndex = formData.get("bodyMassIndex") as string | null
    const bodyFatMass = formData.get("bodyFatMass") as string | null
    const memo = formData.get("memo") as string | null

    if (measuredDate) insertData.measured_date = measuredDate
    if (weight) insertData.weight = Number(weight)
    if (skeletalMuscleMass) insertData.skeletal_muscle_mass = Number(skeletalMuscleMass)
    if (bodyFatPercentage) insertData.body_fat_percentage = Number(bodyFatPercentage)
    if (bodyMassIndex) insertData.body_mass_index = Number(bodyMassIndex)
    if (bodyFatMass) insertData.body_fat_mass = Number(bodyFatMass)
    if (memo) insertData.memo = memo
  } else {
    const body = await c.req.json<Record<string, unknown>>()
    if (body.measuredDate) insertData.measured_date = body.measuredDate
    if (body.weight !== undefined) insertData.weight = body.weight
    if (body.skeletalMuscleMass !== undefined) insertData.skeletal_muscle_mass = body.skeletalMuscleMass
    if (body.bodyFatPercentage !== undefined) insertData.body_fat_percentage = body.bodyFatPercentage
    if (body.bodyMassIndex !== undefined) insertData.body_mass_index = body.bodyMassIndex
    if (body.bodyFatMass !== undefined) insertData.body_fat_mass = body.bodyFatMass
    if (body.memo !== undefined) insertData.memo = body.memo
  }

  const { data, error } = await adminSupabase
    .from("inbody_records")
    .insert(insertData)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

inbodyRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const from = c.req.query("from")
  const to = c.req.query("to")

  let query = adminSupabase
    .from("inbody_records")
    .select("*")
    .eq("user_id", userId)
    .order("measured_date", { ascending: false })
    .order("created_at", { ascending: false })

  query = applyDateFilter(query, from, to)

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data ?? [])
})

inbodyRoutes.get("/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const memberId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const from = c.req.query("from")
  const to = c.req.query("to")

  const { data: member } = await adminSupabase
    .from("profiles")
    .select("id, trainer_id, role")
    .eq("id", memberId)
    .single()

  if (!member || member.role !== "member" || member.trainer_id !== userId) {
    return c.json({ error: "담당 회원만 조회할 수 있습니다" }, 403)
  }

  let query = adminSupabase
    .from("inbody_records")
    .select("*")
    .eq("user_id", memberId)
    .order("measured_date", { ascending: false })
    .order("created_at", { ascending: false })

  query = applyDateFilter(query, from, to)

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data ?? [])
})

inbodyRoutes.get("/latest", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const { data: members, error: membersError } = await adminSupabase
    .from("profiles")
    .select("id, name, avatar_url")
    .eq("trainer_id", userId)
    .eq("role", "member")
    .is("deleted_at", null)
    .order("name", { ascending: true })

  if (membersError) return c.json({ error: membersError.message }, 400)
  if (!members?.length) return c.json([])

  const memberIds = members.map((member) => member.id)
  const { data: records, error: recordsError } = await adminSupabase
    .from("inbody_records")
    .select("*")
    .in("user_id", memberIds)
    .order("measured_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (recordsError) return c.json({ error: recordsError.message }, 400)

  const { data: reminders, error: remindersError } = await adminSupabase
    .from("inbody_reminder_settings")
    .select("*")
    .eq("trainer_id", userId)
    .in("user_id", memberIds)

  if (remindersError) return c.json({ error: remindersError.message }, 400)

  const latestByMember = new Map<string, Record<string, unknown>>()

  for (const record of records ?? []) {
    if (!latestByMember.has(record.user_id)) {
      latestByMember.set(record.user_id, record)
    }
  }

  const reminderByMember = new Map(
    (reminders ?? []).map((reminder) => [reminder.user_id as string, reminder])
  )

  return c.json(
    members.map((member) => ({
      member_id: member.id,
      member_name: member.name,
      member_avatar_url: member.avatar_url ?? null,
      latest_record: latestByMember.get(member.id) ?? null,
      reminder_setting: reminderByMember.get(member.id) ?? null,
    }))
  )
})

inbodyRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const recordId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const { data: existing } = await adminSupabase
    .from("inbody_records")
    .select("id, user_id, photo_urls")
    .eq("id", recordId)
    .single()

  if (!existing) return c.json({ error: "인바디 기록을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: "본인의 인바디 기록만 수정할 수 있습니다" }, 403)
  }

  const contentType = c.req.header("Content-Type") ?? ""
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)
    const existingUrlsRaw = formData.get("existingUrls")
    const keptUrls: string[] = existingUrlsRaw
      ? (JSON.parse(existingUrlsRaw as string) as string[])
      : []

    if (files.length + keptUrls.length > MAX_IMAGES) {
      return c.json({ error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` }, 400)
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > MAX_INBODY_IMAGE_BYTES) {
        return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
      }
    }

    // 유지하지 않는 기존 URL 삭제
    const previousUrls = (existing.photo_urls as string[] | null) ?? []
    const urlsToDelete = previousUrls.filter((url) => !keptUrls.includes(url))
    await deletePublicFiles(urlsToDelete)

    // 새 파일 업로드
    const newlyUploadedUrls = await Promise.all(
      files.map((file) =>
        uploadPublicFile({ file, folder: "inbody", ownerId: userId }).then((r) => r.publicUrl)
      )
    )

    updateData.photo_urls = [...keptUrls, ...newlyUploadedUrls]

    const measuredDate = formData.get("measuredDate") as string | null
    const weight = formData.get("weight") as string | null
    const skeletalMuscleMass = formData.get("skeletalMuscleMass") as string | null
    const bodyFatPercentage = formData.get("bodyFatPercentage") as string | null
    const bodyMassIndex = formData.get("bodyMassIndex") as string | null
    const bodyFatMass = formData.get("bodyFatMass") as string | null
    const memo = formData.get("memo") as string | null

    if (measuredDate) updateData.measured_date = measuredDate
    if (weight !== null) updateData.weight = parseNumberValue(weight)
    if (skeletalMuscleMass !== null) updateData.skeletal_muscle_mass = parseNumberValue(skeletalMuscleMass)
    if (bodyFatPercentage !== null) updateData.body_fat_percentage = parseNumberValue(bodyFatPercentage)
    if (bodyMassIndex !== null) updateData.body_mass_index = parseNumberValue(bodyMassIndex)
    if (bodyFatMass !== null) updateData.body_fat_mass = parseNumberValue(bodyFatMass)
    if (memo !== null) updateData.memo = memo || null
  } else {
    const body = await c.req.json<Record<string, unknown>>()
    if (body.measuredDate) updateData.measured_date = body.measuredDate
    if (body.weight !== undefined) updateData.weight = body.weight
    if (body.skeletalMuscleMass !== undefined) updateData.skeletal_muscle_mass = body.skeletalMuscleMass
    if (body.bodyFatPercentage !== undefined) updateData.body_fat_percentage = body.bodyFatPercentage
    if (body.bodyMassIndex !== undefined) updateData.body_mass_index = body.bodyMassIndex
    if (body.bodyFatMass !== undefined) updateData.body_fat_mass = body.bodyFatMass
    if (body.memo !== undefined) updateData.memo = body.memo || null
  }

  const { data, error } = await adminSupabase
    .from("inbody_records")
    .update(updateData)
    .eq("id", recordId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

inbodyRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const recordId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const { data: existing } = await adminSupabase
    .from("inbody_records")
    .select("id, user_id, photo_urls")
    .eq("id", recordId)
    .single()

  if (!existing) return c.json({ error: "인바디 기록을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: "본인의 인바디 기록만 삭제할 수 있습니다" }, 403)
  }

  await deletePublicFiles((existing.photo_urls as string[] | null) ?? [])

  const { error } = await adminSupabase
    .from("inbody_records")
    .delete()
    .eq("id", recordId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

inbodyRoutes.get("/reminders/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const { data, error } = await adminSupabase
    .from("inbody_reminder_settings")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return c.json({ error: "설정이 없습니다" }, 404)
    return c.json({ error: error.message }, 400)
  }

  return c.json(data)
})

inbodyRoutes.get("/reminders/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const memberId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const { data, error } = await adminSupabase
    .from("inbody_reminder_settings")
    .select("*")
    .eq("user_id", memberId)
    .eq("trainer_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return c.json({ error: "설정이 없습니다" }, 404)
    return c.json({ error: error.message }, 400)
  }

  return c.json(data)
})

inbodyRoutes.put("/reminders/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 설정할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const memberId = c.req.param("id")
  const body = await c.req.json<{ measurementDay?: number; enabled?: boolean }>()

  if (!body.measurementDay || body.measurementDay < 1 || body.measurementDay > 31) {
    return c.json({ error: "측정일은 1일부터 31일 사이여야 합니다" }, 400)
  }

  const adminSupabase = createAdminSupabase()
  const { data: member } = await adminSupabase
    .from("profiles")
    .select("id, role, trainer_id")
    .eq("id", memberId)
    .single()

  if (!member || member.role !== "member" || member.trainer_id !== userId) {
    return c.json({ error: "담당 회원만 설정할 수 있습니다" }, 403)
  }

  const { data, error } = await adminSupabase
    .from("inbody_reminder_settings")
    .upsert(
      {
        user_id: memberId,
        trainer_id: userId,
        measurement_day: normalizeReminderDay(body.measurementDay),
        enabled: body.enabled ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})
