export type NoticeCategory = "general" | "important" | "event"

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  general: "일반",
  important: "중요",
  event: "이벤트",
}

export interface Notice {
  id: string
  title: string
  content: Record<string, unknown>
  category: NoticeCategory
  isPinned: boolean
  authorId: string
  authorName: string | null
  createdAt: string
  updatedAt: string
}

export interface NoticeInput {
  title: string
  content: Record<string, unknown>
  category: NoticeCategory
  isPinned: boolean
}

export interface NoticeListResponse {
  notices: Notice[]
  total: number
}
