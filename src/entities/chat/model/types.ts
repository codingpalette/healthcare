export type ChatMessageType = "text" | "feedback" | "meal_share" | "workout_share"

export interface ChatAttachmentPayload {
  recordId?: string
  recordType?: "meal" | "workout"
  title?: string
  summary?: string | null
  mediaUrl?: string | null
  mediaType?: "image" | "video" | null
  date?: string | null
  chips?: string[]
}

export interface ChatRoomSummary {
  id: string
  memberId: string
  trainerId: string
  counterpartId: string
  counterpartName: string
  counterpartRole: "member" | "trainer"
  counterpartAvatarUrl: string | null
  lastMessagePreview: string | null
  lastMessageType: ChatMessageType | null
  lastMessageAt: string | null
  unreadCount: number
  myLastReadAt: string | null
  counterpartLastReadAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderRole: "member" | "trainer"
  senderAvatarUrl: string | null
  messageType: ChatMessageType
  content: string | null
  attachmentPayload: ChatAttachmentPayload | null
  createdAt: string
  updatedAt: string
}

export interface SendChatMessageInput {
  roomId?: string
  type: ChatMessageType
  content?: string
  mealId?: string
  workoutId?: string
}
