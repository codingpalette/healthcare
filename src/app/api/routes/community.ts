import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/app/api/_lib/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

export const communityRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)

// 현재 사용자의 커뮤니티 참여 상태 조회
communityRoutes.get("/status", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  const { data, error } = await adminSupabase
    .from("community_members")
    .select("id, nickname")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle<{ id: string; nickname: string }>()

  if (error) return c.json({ error: error.message }, 400)

  if (!data) {
    return c.json({ joined: false, nickname: null, memberId: null })
  }

  return c.json({ joined: true, nickname: data.nickname, memberId: data.id })
})

// 커뮤니티 채팅 참여
communityRoutes.post("/join", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  const body = await c.req.json<{ nickname?: string }>()
  const nickname = body.nickname?.trim()

  if (!nickname || nickname.length < 2 || nickname.length > 20) {
    return c.json({ error: "닉네임은 2자 이상 20자 이하로 입력해주세요" }, 400)
  }

  // 이미 참여 중인지 확인
  const { data: existing, error: existingError } = await adminSupabase
    .from("community_members")
    .select("id")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle<{ id: string }>()

  if (existingError) return c.json({ error: existingError.message }, 400)
  if (existing) {
    return c.json({ error: "이미 커뮤니티에 참여 중입니다" }, 409)
  }

  // 닉네임 중복 확인 (활성 멤버 기준)
  const { data: nicknameTaken, error: nicknameError } = await adminSupabase
    .from("community_members")
    .select("id")
    .eq("nickname", nickname)
    .is("left_at", null)
    .maybeSingle<{ id: string }>()

  if (nicknameError) return c.json({ error: nicknameError.message }, 400)
  if (nicknameTaken) {
    return c.json({ error: "이미 사용 중인 닉네임입니다" }, 409)
  }

  const { data, error } = await adminSupabase
    .from("community_members")
    .insert({ user_id: userId, nickname })
    .select("id, nickname, joined_at")
    .single<{ id: string; nickname: string; joined_at: string }>()

  if (error) return c.json({ error: error.message }, 400)

  return c.json({ memberId: data.id, nickname: data.nickname, joinedAt: data.joined_at }, 201)
})

// 커뮤니티 채팅 퇴장
communityRoutes.post("/leave", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  const { data: member, error: memberError } = await adminSupabase
    .from("community_members")
    .select("id")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle<{ id: string }>()

  if (memberError) return c.json({ error: memberError.message }, 400)
  if (!member) {
    return c.json({ error: "커뮤니티에 참여 중이 아닙니다" }, 404)
  }

  const { error } = await adminSupabase
    .from("community_members")
    .update({ left_at: new Date().toISOString() })
    .eq("id", member.id)

  if (error) return c.json({ error: error.message }, 400)

  return c.json({ success: true })
})

// 메시지 목록 조회 (커서 기반 페이지네이션)
communityRoutes.get("/messages", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  // 활성 멤버인지 확인
  const { data: member, error: memberError } = await adminSupabase
    .from("community_members")
    .select("id")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle<{ id: string }>()

  if (memberError) return c.json({ error: memberError.message }, 400)
  if (!member) {
    return c.json({ error: "커뮤니티에 참여 후 메시지를 볼 수 있습니다" }, 403)
  }

  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100)
  const cursor = c.req.query("cursor") // created_at 기준 커서

  let query = adminSupabase
    .from("community_messages")
    .select(`
      id,
      member_id,
      content,
      created_at,
      community_members!community_messages_member_id_fkey (
        nickname
      )
    `)
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
    const communityMember = row.community_members as Record<string, unknown> | null

    return {
      id: row.id,
      memberId: row.member_id,
      nickname: communityMember?.nickname ?? "익명",
      content: row.content,
      createdAt: row.created_at,
      isMine: row.member_id === member.id,
    }
  })

  return c.json({ messages, hasMore })
})

// 메시지 전송
communityRoutes.post("/messages", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  // 활성 멤버인지 확인
  const { data: member, error: memberError } = await adminSupabase
    .from("community_members")
    .select("id")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle<{ id: string }>()

  if (memberError) return c.json({ error: memberError.message }, 400)
  if (!member) {
    return c.json({ error: "커뮤니티에 참여 후 메시지를 보낼 수 있습니다" }, 403)
  }

  const body = await c.req.json<{ content?: string }>()
  const content = body.content?.trim()

  if (!content || content.length < 1 || content.length > 500) {
    return c.json({ error: "메시지는 1자 이상 500자 이하로 입력해주세요" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("community_messages")
    .insert({ member_id: member.id, content })
    .select(`
      id,
      member_id,
      content,
      created_at,
      community_members!community_messages_member_id_fkey (
        nickname
      )
    `)
    .single()

  if (error) return c.json({ error: error.message }, 400)

  const row = data as Record<string, unknown>
  const communityMember = row.community_members as Record<string, unknown> | null

  return c.json(
    {
      id: row.id,
      memberId: row.member_id,
      nickname: communityMember?.nickname ?? "익명",
      content: row.content,
      createdAt: row.created_at,
      isMine: true,
    },
    201
  )
})
