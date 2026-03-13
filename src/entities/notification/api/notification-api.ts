import { supabase } from "@/shared/api/supabase"
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
  NotificationPreferencesInput,
  PushSubscriptionInput,
} from "@/entities/notification/model/types"

function toNotification(row: Record<string, unknown>): NotificationItem {
  return {
    id: row.id as string,
    recipientId: row.recipient_id as string,
    actorId: (row.actor_id as string) ?? null,
    kind: row.kind as NotificationItem["kind"],
    title: row.title as string,
    message: row.message as string,
    link: (row.link as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    scheduledFor: (row.scheduled_for as string) ?? null,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toPreferences(row: Record<string, unknown>): NotificationPreferences {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    inbodyEnabled: Boolean(row.inbody_enabled),
    attendanceEnabled: Boolean(row.attendance_enabled),
    chatEnabled: Boolean(row.chat_enabled ?? true),
    feedbackEnabled: Boolean(row.feedback_enabled ?? true),
    pushEnabled: Boolean(row.push_enabled),
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

export async function getNotifications(limit = 20, unreadOnly = false): Promise<NotificationListResponse> {
  const accessToken = await getAccessToken()
  const params = new URLSearchParams()
  params.set("limit", String(limit))
  if (unreadOnly) params.set("unreadOnly", "true")

  const res = await fetch(`/api/notifications?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "알림 조회에 실패했습니다")
  }

  const data = await res.json()
  return {
    notifications: (data.notifications as Record<string, unknown>[]).map(toNotification),
    unreadCount: Number(data.unreadCount ?? 0),
  }
}

export async function syncNotifications(): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notifications/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "알림 동기화에 실패했습니다")
  }
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "알림 읽음 처리에 실패했습니다")
  }

  return toNotification(await res.json())
}

export async function markAllNotificationsRead(): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notifications/read-all", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "전체 알림 읽음 처리에 실패했습니다")
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notifications/preferences/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "알림 설정 조회에 실패했습니다")
  }

  return toPreferences(await res.json())
}

export async function updateNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<NotificationPreferences> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notifications/preferences/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "알림 설정 저장에 실패했습니다")
  }

  return toPreferences(await res.json())
}

export async function savePushSubscription(input: PushSubscriptionInput): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notifications/push-subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "푸시 구독 저장에 실패했습니다")
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notifications/push-subscriptions", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "푸시 구독 해제에 실패했습니다")
  }
}
