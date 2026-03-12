import { supabase } from "@/shared/api/supabase"
import type {
  ChatMessage,
  ChatRoomSummary,
  SendChatMessageInput,
} from "@/entities/chat/model/types"

function toChatRoom(row: Record<string, unknown>): ChatRoomSummary {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    trainerId: row.trainer_id as string,
    counterpartId: row.counterpart_id as string,
    counterpartName: row.counterpart_name as string,
    counterpartRole: row.counterpart_role as "member" | "trainer",
    counterpartAvatarUrl: (row.counterpart_avatar_url as string) ?? null,
    lastMessagePreview: (row.last_message_preview as string) ?? null,
    lastMessageType: (row.last_message_type as ChatRoomSummary["lastMessageType"]) ?? null,
    lastMessageAt: (row.last_message_at as string) ?? null,
    unreadCount: Number(row.unread_count ?? 0),
    myLastReadAt: (row.my_last_read_at as string) ?? null,
    counterpartLastReadAt: (row.counterpart_last_read_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    senderId: row.sender_id as string,
    senderName: row.sender_name as string,
    senderRole: row.sender_role as "member" | "trainer",
    senderAvatarUrl: (row.sender_avatar_url as string) ?? null,
    messageType: row.message_type as ChatMessage["messageType"],
    content: (row.content as string) ?? null,
    attachmentPayload: (row.attachment_payload as ChatMessage["attachmentPayload"]) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function getChatRooms(): Promise<ChatRoomSummary[]> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/chat/rooms", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "관리톡 목록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toChatRoom)
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "메시지 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toChatMessage)
}

export async function ensureChatRoom(counterpartId: string): Promise<ChatRoomSummary> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/chat/rooms/ensure", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ counterpartId }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "관리톡 대화방 준비에 실패했습니다")
  }

  const row = await res.json()
  return toChatRoom(row)
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<ChatMessage> {
  const accessToken = await getAccessToken()
  if (!input.roomId) {
    throw new Error("메시지를 보낼 대화방이 필요합니다")
  }

  const res = await fetch(`/api/chat/rooms/${input.roomId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "메시지 전송에 실패했습니다")
  }

  const row = await res.json()
  return toChatMessage(row)
}

export async function markChatRoomRead(roomId: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/chat/rooms/${roomId}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "읽음 처리에 실패했습니다")
  }
}

export async function updateChatMessage(
  messageId: string,
  content: string
): Promise<ChatMessage> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/chat/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "메시지 수정에 실패했습니다")
  }

  const row = await res.json()
  return toChatMessage(row)
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/chat/messages/${messageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "메시지 삭제에 실패했습니다")
  }
}
