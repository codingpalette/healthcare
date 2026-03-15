import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { sendPushNotifications } from "@/app/api/_lib/web-push"

export function getDefaultNotificationPreferences(userId: string) {
  const now = new Date().toISOString()

  return {
    id: `default-${userId}`,
    user_id: userId,
    inbody_enabled: true,
    attendance_enabled: true,
    chat_enabled: true,
    feedback_enabled: true,
    push_enabled: false,
    membership_enabled: true,
    created_at: now,
    updated_at: now,
  }
}

export async function getNotificationPreferencesRow(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  userId: string
) {
  const { data, error } = await adminSupabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? getDefaultNotificationPreferences(userId)
}

export async function createNotificationIfNeeded(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  input: {
    recipientId: string
    actorId?: string | null
    kind:
      | "inbody_reminder"
      | "attendance_absence"
      | "chat_message"
      | "meal_feedback"
      | "workout_feedback"
      | "system"
      | "membership_expiry"
    title: string
    message: string
    link?: string | null
    metadata?: Record<string, unknown>
    dedupeKey: string
  },
  pushEnabled: boolean
) {
  const { data: existing } = await adminSupabase
    .from("notifications")
    .select("id")
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle()

  if (existing) return null

  const { data, error } = await adminSupabase
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      actor_id: input.actorId ?? null,
      kind: input.kind,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
      dedupe_key: input.dedupeKey,
      scheduled_for: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !data) return null

  if (pushEnabled) {
    await sendPushNotifications(adminSupabase, input.recipientId, {
      title: input.title,
      body: input.message,
      url: input.link ?? "/notifications",
    })
  }

  return data
}
