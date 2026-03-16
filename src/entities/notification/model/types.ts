export type NotificationKind =
  | "inbody_reminder"
  | "attendance_absence"
  | "chat_message"
  | "meal_feedback"
  | "workout_feedback"
  | "system"
  | "membership_expiry"
  | "notice"

export interface NotificationItem {
  id: string
  recipientId: string
  actorId: string | null
  kind: NotificationKind
  title: string
  message: string
  link: string | null
  metadata: Record<string, unknown>
  scheduledFor: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

export interface NotificationPreferences {
  id: string
  userId: string
  inbodyEnabled: boolean
  attendanceEnabled: boolean
  chatEnabled: boolean
  feedbackEnabled: boolean
  pushEnabled: boolean
  membershipEnabled: boolean
  noticeEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferencesInput {
  inbodyEnabled: boolean
  attendanceEnabled: boolean
  chatEnabled: boolean
  feedbackEnabled: boolean
  pushEnabled: boolean
  membershipEnabled: boolean
  noticeEnabled: boolean
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}
