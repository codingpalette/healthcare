import { Hono } from "hono"
import {
  createNotificationIfNeeded,
  getNotificationPreferencesRow,
} from "@/app/api/_lib/notifications"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

type ProfileRow = {
  id: string
  role: "member" | "trainer"
  name: string
  avatar_url: string | null
  trainer_id?: string | null
}

type ChatRoomRow = {
  id: string
  member_id: string
  trainer_id: string
  member_last_read_at: string | null
  trainer_last_read_at: string | null
  last_message_at: string | null
  last_message_preview: string | null
  last_message_type: "text" | "feedback" | "meal_share" | "workout_share" | null
  last_message_sender_id: string | null
  created_at: string
  updated_at: string
}

type ChatMessageRow = {
  id: string
  room_id: string
  sender_id: string
  message_type: "text" | "feedback" | "meal_share" | "workout_share"
  content: string | null
  attachment_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export const chatRoutes = new Hono<AuthEnv>().use(authMiddleware)

function getRoomReadField(userRole: "member" | "trainer") {
  return userRole === "trainer" ? "trainer_last_read_at" : "member_last_read_at"
}

function buildMessagePreview(
  messageType: ChatMessageRow["message_type"],
  content: string | null,
  attachmentPayload: Record<string, unknown> | null
) {
  if (messageType === "meal_share") {
    return `${String(attachmentPayload?.title ?? "식단 인증")}을 공유했어요`
  }
  if (messageType === "workout_share") {
    return `${String(attachmentPayload?.title ?? "운동 인증")}을 공유했어요`
  }
  if (messageType === "feedback") {
    if (attachmentPayload?.title) {
      const prefix = attachmentPayload?.recordType === "meal" ? "[식단 피드백]" : "[운동 피드백]"
      return `${prefix} ${String(attachmentPayload.title)}${content ? ` · ${content}` : ""}`
    }
    return `[피드백] ${content ?? ""}`.trim()
  }
  return content ?? ""
}

async function buildRoomSummary(
  room: ChatRoomRow,
  userId: string,
  userRole: "member" | "trainer",
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  counterpart?: ProfileRow | null
) {
  const counterpartId = userRole === "trainer" ? room.member_id : room.trainer_id
  let resolvedCounterpart = counterpart ?? null

  if (!resolvedCounterpart) {
    const { data } = await adminSupabase
      .from("profiles")
      .select("id, role, name, avatar_url")
      .eq("id", counterpartId)
      .maybeSingle<ProfileRow>()

    resolvedCounterpart = data ?? null
  }

  const myLastReadAt = userRole === "trainer" ? room.trainer_last_read_at : room.member_last_read_at
  const counterpartLastReadAt =
    userRole === "trainer" ? room.member_last_read_at : room.trainer_last_read_at

  let unreadQuery = adminSupabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id)
    .neq("sender_id", userId)

  if (myLastReadAt) {
    unreadQuery = unreadQuery.gt("created_at", myLastReadAt)
  }

  const { count } = await unreadQuery

  return {
    ...room,
    counterpart_id: resolvedCounterpart?.id ?? counterpartId,
    counterpart_name: resolvedCounterpart?.name ?? "상대방",
    counterpart_role: resolvedCounterpart?.role ?? (userRole === "trainer" ? "member" : "trainer"),
    counterpart_avatar_url: resolvedCounterpart?.avatar_url ?? null,
    unread_count: count ?? 0,
    my_last_read_at: myLastReadAt,
    counterpart_last_read_at: counterpartLastReadAt,
  }
}

async function refreshRoomMetadata(roomId: string, adminSupabase: ReturnType<typeof createAdminSupabase>) {
  const { data: latestMessage } = await adminSupabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ChatMessageRow>()

  if (!latestMessage) {
    await adminSupabase
      .from("chat_rooms")
      .update({
        last_message_at: null,
        last_message_preview: null,
        last_message_type: null,
        last_message_sender_id: null,
      })
      .eq("id", roomId)
    return
  }

  await adminSupabase
    .from("chat_rooms")
    .update({
      last_message_at: latestMessage.created_at,
      last_message_preview: buildMessagePreview(
        latestMessage.message_type,
        latestMessage.content,
        latestMessage.attachment_payload
      ),
      last_message_type: latestMessage.message_type,
      last_message_sender_id: latestMessage.sender_id,
    })
    .eq("id", roomId)
}

async function loadChatRelationships(
  userId: string,
  userRole: "member" | "trainer",
  adminSupabase: ReturnType<typeof createAdminSupabase>
) {
  if (userRole === "trainer") {
    const { data, error } = await adminSupabase
      .from("profiles")
      .select("id, role, name, avatar_url")
      .eq("trainer_id", userId)
      .eq("role", "member")
      .is("deleted_at", null)
      .order("name", { ascending: true })

    if (error) throw error
    return (data ?? []) as ProfileRow[]
  }

  const { data: me, error: meError } = await adminSupabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", userId)
    .single<{ trainer_id: string | null }>()

  if (meError) throw meError
  if (!me?.trainer_id) return []

  const { data: trainer, error: trainerError } = await adminSupabase
    .from("profiles")
    .select("id, role, name, avatar_url")
    .eq("id", me.trainer_id)
    .maybeSingle<ProfileRow>()

  if (trainerError) throw trainerError
  return trainer ? [trainer] : []
}

async function getAuthorizedRoom(
  roomId: string,
  userId: string,
  adminSupabase: ReturnType<typeof createAdminSupabase>
) {
  const { data: room, error } = await adminSupabase
    .from("chat_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle<ChatRoomRow>()

  if (error) throw error
  if (!room) return null
  if (room.member_id !== userId && room.trainer_id !== userId) return null
  return room
}

chatRoutes.get("/rooms", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole") as "member" | "trainer"
  const adminSupabase = createAdminSupabase()

  const relationships = await loadChatRelationships(userId, userRole, adminSupabase)
  if (relationships.length === 0) {
    return c.json([])
  }

  const counterpartIds = relationships.map((profile) => profile.id)
  const roomQuery =
    userRole === "trainer"
      ? adminSupabase
          .from("chat_rooms")
          .select("*")
          .eq("trainer_id", userId)
          .in("member_id", counterpartIds)
      : adminSupabase
          .from("chat_rooms")
          .select("*")
          .eq("member_id", userId)
          .in("trainer_id", counterpartIds)

  const { data: existingRooms, error: roomError } = await roomQuery
  if (roomError) return c.json({ error: roomError.message }, 400)

  const existingByCounterpart = new Map<string, ChatRoomRow>()
  for (const room of (existingRooms ?? []) as ChatRoomRow[]) {
    existingByCounterpart.set(userRole === "trainer" ? room.member_id : room.trainer_id, room)
  }

  const missingProfiles = relationships.filter((profile) => !existingByCounterpart.has(profile.id))
  let insertedRooms: ChatRoomRow[] = []

  if (missingProfiles.length > 0) {
    const { data: createdRooms, error: createError } = await adminSupabase
      .from("chat_rooms")
      .upsert(
        missingProfiles.map((profile) => ({
          member_id: userRole === "trainer" ? profile.id : userId,
          trainer_id: userRole === "trainer" ? userId : profile.id,
        })),
        { onConflict: "member_id,trainer_id" }
      )
      .select("*")

    if (createError) return c.json({ error: createError.message }, 400)
    insertedRooms = (createdRooms ?? []) as ChatRoomRow[]
  }

  const allRooms = [...((existingRooms ?? []) as ChatRoomRow[]), ...insertedRooms]

  const summaries = await Promise.all(
    allRooms.map((room) =>
      buildRoomSummary(
        room,
        userId,
        userRole,
        adminSupabase,
        relationships.find((profile) =>
          userRole === "trainer" ? profile.id === room.member_id : profile.id === room.trainer_id
        ) ?? null
      )
    )
  )

  summaries.sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    if (aTime !== bTime) return bTime - aTime
    return a.counterpart_name.localeCompare(b.counterpart_name, "ko")
  })

  return c.json(summaries)
})

chatRoutes.post("/rooms/ensure", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole") as "member" | "trainer"
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{ counterpartId?: string }>()

  if (!body.counterpartId) {
    return c.json({ error: "상대방 정보가 필요합니다" }, 400)
  }

  if (userRole === "trainer") {
    const { data: member, error: memberError } = await adminSupabase
      .from("profiles")
      .select("id, role, name, avatar_url, trainer_id")
      .eq("id", body.counterpartId)
      .maybeSingle<ProfileRow>()

    if (memberError || !member) {
      return c.json({ error: "회원을 찾을 수 없습니다" }, 404)
    }
    if (member.role !== "member" || member.trainer_id !== userId) {
      return c.json({ error: "담당 회원과만 관리톡을 열 수 있습니다" }, 403)
    }

    const { data: room, error } = await adminSupabase
      .from("chat_rooms")
      .upsert(
        {
          member_id: member.id,
          trainer_id: userId,
        },
        { onConflict: "member_id,trainer_id" }
      )
      .select("*")
      .single<ChatRoomRow>()

    if (error) return c.json({ error: error.message }, 400)

    const summary = await buildRoomSummary(room, userId, userRole, adminSupabase, member)
    return c.json(summary)
  }

  const { data: me, error: meError } = await adminSupabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", userId)
    .single<{ trainer_id: string | null }>()

  if (meError) return c.json({ error: meError.message }, 400)
  if (!me?.trainer_id || me.trainer_id !== body.counterpartId) {
    return c.json({ error: "배정된 트레이너와만 관리톡을 열 수 있습니다" }, 403)
  }

  const { data: trainer, error: trainerError } = await adminSupabase
    .from("profiles")
    .select("id, role, name, avatar_url")
    .eq("id", body.counterpartId)
    .maybeSingle<ProfileRow>()

  if (trainerError || !trainer) {
    return c.json({ error: "트레이너를 찾을 수 없습니다" }, 404)
  }

  const { data: room, error } = await adminSupabase
    .from("chat_rooms")
    .upsert(
      {
        member_id: userId,
        trainer_id: trainer.id,
      },
      { onConflict: "member_id,trainer_id" }
    )
    .select("*")
    .single<ChatRoomRow>()

  if (error) return c.json({ error: error.message }, 400)

  const summary = await buildRoomSummary(room, userId, userRole, adminSupabase, trainer)
  return c.json(summary)
})

chatRoutes.get("/rooms/:id/messages", async (c) => {
  const userId = c.get("userId")
  const roomId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const room = await getAuthorizedRoom(roomId, userId, adminSupabase)
  if (!room) {
    return c.json({ error: "대화방을 찾을 수 없습니다" }, 404)
  }

  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100)
  const cursor = c.req.query("cursor") // created_at 기준 커서

  let query = adminSupabase
    .from("chat_messages")
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey (
        id,
        name,
        role,
        avatar_url
      )
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit + 1) // 다음 페이지 존재 여부 확인용

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)

  const rows = data ?? []
  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows

  // 오래된 순으로 정렬해서 반환
  const messages = sliced.reverse().map((row: Record<string, unknown>) => {
    const sender = row.sender as Record<string, unknown> | null

    return {
      ...row,
      sender: undefined,
      sender_name: sender?.name ?? "사용자",
      sender_role: sender?.role ?? "member",
      sender_avatar_url: sender?.avatar_url ?? null,
    }
  })

  return c.json({ messages, hasMore })
})

chatRoutes.post("/rooms/:id/messages", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole") as "member" | "trainer"
  const roomId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const room = await getAuthorizedRoom(roomId, userId, adminSupabase)
  if (!room) {
    return c.json({ error: "대화방을 찾을 수 없습니다" }, 404)
  }

  const body = await c.req.json<{
    type?: ChatMessageRow["message_type"]
    content?: string
    mealId?: string
    workoutId?: string
  }>()

  if (!body.type || !["text", "feedback", "meal_share", "workout_share"].includes(body.type)) {
    return c.json({ error: "올바른 메시지 유형이 필요합니다" }, 400)
  }

  const insertData: Record<string, unknown> = {
    room_id: roomId,
    sender_id: userId,
    message_type: body.type,
  }

  if (body.type === "text" || body.type === "feedback") {
    const content = body.content?.trim()
    if (!content) {
      return c.json({ error: "메시지 내용을 입력해주세요" }, 400)
    }
    if (body.type === "feedback" && userRole !== "trainer") {
      return c.json({ error: "트레이너만 피드백 메시지를 보낼 수 있습니다" }, 403)
    }
    insertData.content = content
  }

  if (body.type === "feedback" && body.mealId) {
    const { data: meal, error: mealError } = await adminSupabase
      .from("meals")
      .select("*")
      .eq("id", body.mealId)
      .eq("user_id", room.member_id)
      .maybeSingle<Record<string, unknown>>()

    if (mealError || !meal) {
      return c.json({ error: "피드백을 남길 식단을 찾을 수 없습니다" }, 404)
    }

    insertData.attachment_payload = {
      recordId: meal.id,
      recordType: "meal",
      title: `${meal.meal_type === "breakfast" ? "아침" : meal.meal_type === "lunch" ? "점심" : meal.meal_type === "dinner" ? "저녁" : "간식"} 식단`,
      summary: meal.description ?? null,
      mediaUrl: meal.photo_url ?? null,
      mediaType: meal.photo_url ? "image" : null,
      date: meal.date ?? null,
      chips: [
        meal.calories != null ? `${meal.calories}kcal` : null,
        meal.carbs != null ? `탄 ${meal.carbs}g` : null,
        meal.protein != null ? `단 ${meal.protein}g` : null,
        meal.fat != null ? `지 ${meal.fat}g` : null,
      ].filter(Boolean),
    }
  }

  if (body.type === "feedback" && body.workoutId) {
    const { data: workout, error: workoutError } = await adminSupabase
      .from("workouts")
      .select("*")
      .eq("id", body.workoutId)
      .eq("user_id", room.member_id)
      .maybeSingle<Record<string, unknown>>()

    if (workoutError || !workout) {
      return c.json({ error: "피드백을 남길 운동 기록을 찾을 수 없습니다" }, 404)
    }

    insertData.attachment_payload = {
      recordId: workout.id,
      recordType: "workout",
      title: workout.exercise_name,
      summary: workout.notes ?? null,
      mediaUrl: workout.media_url ?? null,
      mediaType: workout.media_type ?? null,
      date: workout.date ?? null,
      chips: [
        workout.sets != null ? `${workout.sets}세트` : null,
        workout.reps != null ? `${workout.reps}회` : null,
        workout.weight != null ? `${workout.weight}kg` : null,
        workout.duration_minutes != null ? `${workout.duration_minutes}분` : null,
        workout.calories_burned != null ? `${workout.calories_burned}kcal` : null,
      ].filter(Boolean),
    }
  }

  if (body.type === "meal_share") {
    if (userRole !== "member") {
      return c.json({ error: "회원만 식단 인증을 공유할 수 있습니다" }, 403)
    }

    const { data: meal, error: mealError } = await adminSupabase
      .from("meals")
      .select("*")
      .eq("id", body.mealId ?? "")
      .eq("user_id", userId)
      .maybeSingle<Record<string, unknown>>()

    if (mealError || !meal) {
      return c.json({ error: "공유할 식단을 찾을 수 없습니다" }, 404)
    }

    insertData.attachment_payload = {
      recordId: meal.id,
      recordType: "meal",
      title: `${meal.meal_type === "breakfast" ? "아침" : meal.meal_type === "lunch" ? "점심" : meal.meal_type === "dinner" ? "저녁" : "간식"} 식단`,
      summary: meal.description ?? null,
      mediaUrl: meal.photo_url ?? null,
      mediaType: meal.photo_url ? "image" : null,
      date: meal.date ?? null,
      chips: [
        meal.calories != null ? `${meal.calories}kcal` : null,
        meal.carbs != null ? `탄 ${meal.carbs}g` : null,
        meal.protein != null ? `단 ${meal.protein}g` : null,
        meal.fat != null ? `지 ${meal.fat}g` : null,
      ].filter(Boolean),
    }
  }

  if (body.type === "workout_share") {
    if (userRole !== "member") {
      return c.json({ error: "회원만 운동 인증을 공유할 수 있습니다" }, 403)
    }

    const { data: workout, error: workoutError } = await adminSupabase
      .from("workouts")
      .select("*")
      .eq("id", body.workoutId ?? "")
      .eq("user_id", userId)
      .maybeSingle<Record<string, unknown>>()

    if (workoutError || !workout) {
      return c.json({ error: "공유할 운동 기록을 찾을 수 없습니다" }, 404)
    }

    insertData.attachment_payload = {
      recordId: workout.id,
      recordType: "workout",
      title: workout.exercise_name,
      summary: workout.notes ?? null,
      mediaUrl: workout.media_url ?? null,
      mediaType: workout.media_type ?? null,
      date: workout.date ?? null,
      chips: [
        workout.sets != null ? `${workout.sets}세트` : null,
        workout.reps != null ? `${workout.reps}회` : null,
        workout.weight != null ? `${workout.weight}kg` : null,
        workout.duration_minutes != null ? `${workout.duration_minutes}분` : null,
        workout.calories_burned != null ? `${workout.calories_burned}kcal` : null,
      ].filter(Boolean),
    }
  }

  const { data, error } = await adminSupabase
    .from("chat_messages")
    .insert(insertData)
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey (
        id,
        name,
        role,
        avatar_url
      )
    `)
    .single()

  if (error) return c.json({ error: error.message }, 400)

  const timestamp = (data as Record<string, unknown>).created_at as string
  await adminSupabase
    .from("chat_rooms")
    .update({
      [getRoomReadField(userRole)]: timestamp,
    })
    .eq("id", roomId)

  await refreshRoomMetadata(roomId, adminSupabase)

  const recipientId = userId === room.member_id ? room.trainer_id : room.member_id
  const recipientPreferences = await getNotificationPreferencesRow(adminSupabase, recipientId)

  if (recipientPreferences.chat_enabled) {
    const senderProfile = (data as Record<string, unknown>).sender as Record<string, unknown> | null
    const messagePreview =
      body.type === "text"
        ? body.content?.trim() ?? ""
        : body.type === "feedback"
          ? "새 피드백 메시지가 도착했습니다."
          : body.type === "meal_share"
            ? "식단 인증을 공유했습니다."
            : "운동 인증을 공유했습니다."

    await createNotificationIfNeeded(
      adminSupabase,
      {
        recipientId,
        actorId: userId,
        kind: "chat_message",
        title: `${senderProfile?.name ?? "상대방"}님의 새 관리톡 메시지`,
        message: messagePreview,
        link: "/chat",
        metadata: {
          roomId,
          messageId: (data as Record<string, unknown>).id,
          messageType: body.type,
        },
        dedupeKey: `chat_message:${String((data as Record<string, unknown>).id)}`,
      },
      Boolean(recipientPreferences.push_enabled)
    )
  }

  const sender = (data as Record<string, unknown>).sender as Record<string, unknown> | null
  return c.json({
    ...(data as Record<string, unknown>),
    sender: undefined,
    sender_name: sender?.name ?? "사용자",
    sender_role: sender?.role ?? userRole,
    sender_avatar_url: sender?.avatar_url ?? null,
  }, 201)
})

chatRoutes.patch("/rooms/:id/read", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole") as "member" | "trainer"
  const roomId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const room = await getAuthorizedRoom(roomId, userId, adminSupabase)
  if (!room) {
    return c.json({ error: "대화방을 찾을 수 없습니다" }, 404)
  }

  const { error } = await adminSupabase
    .from("chat_rooms")
    .update({
      [getRoomReadField(userRole)]: new Date().toISOString(),
    })
    .eq("id", roomId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

chatRoutes.patch("/messages/:id", async (c) => {
  const userId = c.get("userId")
  const messageId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{ content?: string }>()
  const content = body.content?.trim()

  if (!content) {
    return c.json({ error: "메시지 내용을 입력해주세요" }, 400)
  }

  const { data: existing, error: existingError } = await adminSupabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle<ChatMessageRow>()

  if (existingError) return c.json({ error: existingError.message }, 400)
  if (!existing) {
    return c.json({ error: "메시지를 찾을 수 없습니다" }, 404)
  }
  if (existing.sender_id !== userId) {
    return c.json({ error: "본인이 보낸 메시지만 수정할 수 있습니다" }, 403)
  }
  if (!["text", "feedback"].includes(existing.message_type)) {
    return c.json({ error: "텍스트 또는 피드백 메시지만 수정할 수 있습니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("chat_messages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey (
        id,
        name,
        role,
        avatar_url
      )
    `)
    .single()

  if (error) return c.json({ error: error.message }, 400)

  await refreshRoomMetadata(existing.room_id, adminSupabase)

  const sender = (data as Record<string, unknown>).sender as Record<string, unknown> | null
  return c.json({
    ...(data as Record<string, unknown>),
    sender: undefined,
    sender_name: sender?.name ?? "사용자",
    sender_role: sender?.role ?? "member",
    sender_avatar_url: sender?.avatar_url ?? null,
  })
})

chatRoutes.delete("/messages/:id", async (c) => {
  const userId = c.get("userId")
  const messageId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: existing, error: existingError } = await adminSupabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle<ChatMessageRow>()

  if (existingError) return c.json({ error: existingError.message }, 400)
  if (!existing) {
    return c.json({ error: "메시지를 찾을 수 없습니다" }, 404)
  }
  if (existing.sender_id !== userId) {
    return c.json({ error: "본인이 보낸 메시지만 삭제할 수 있습니다" }, 403)
  }

  const { error } = await adminSupabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId)

  if (error) return c.json({ error: error.message }, 400)

  await refreshRoomMetadata(existing.room_id, adminSupabase)
  return c.json({ success: true })
})
