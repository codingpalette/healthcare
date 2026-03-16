import { supabase } from "@/shared/api/supabase"
import type { CommunityStatus, CommunityMessage, CommunityMessagesPage } from "@/entities/community/model/types"

function toCommunityMessage(row: Record<string, unknown>): CommunityMessage {
  return {
    id: row.id as string,
    memberId: (row.memberId ?? row.member_id) as string,
    nickname: row.nickname as string,
    content: row.content as string,
    createdAt: (row.createdAt ?? row.created_at) as string,
    isMine: (row.isMine ?? row.is_mine) as boolean,
  }
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function getCommunityStatus(): Promise<CommunityStatus> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/community/status", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "커뮤니티 상태 조회에 실패했습니다")
  }

  const data = await res.json()
  const row = data as Record<string, unknown>
  return {
    joined: row.joined as boolean,
    nickname: (row.nickname as string) ?? null,
    memberId: (row.memberId as string) ?? null,
  }
}

export async function joinCommunity(
  nickname: string
): Promise<{ memberId: string; nickname: string; joinedAt: string }> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/community/join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nickname }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "커뮤니티 참여에 실패했습니다")
  }

  const row = await res.json() as Record<string, unknown>
  return {
    memberId: row.memberId as string,
    nickname: row.nickname as string,
    joinedAt: row.joinedAt as string,
  }
}

export async function leaveCommunity(): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/community/leave", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "커뮤니티 탈퇴에 실패했습니다")
  }
}

export async function getCommunityMessages(
  params?: { limit?: number; cursor?: string }
): Promise<CommunityMessagesPage> {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.cursor) searchParams.set("cursor", params.cursor)

  const query = searchParams.toString()
  const res = await fetch(`/api/community/messages${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "커뮤니티 메시지 조회에 실패했습니다")
  }

  const data = await res.json()
  const raw = data as { messages: Record<string, unknown>[]; hasMore: boolean }
  return {
    messages: raw.messages.map(toCommunityMessage),
    hasMore: raw.hasMore,
  }
}

export async function sendCommunityMessage(content: string): Promise<CommunityMessage> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/community/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "커뮤니티 메시지 전송에 실패했습니다")
  }

  const row = await res.json()
  return toCommunityMessage(row)
}
