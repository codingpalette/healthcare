export interface CommunityStatus {
  joined: boolean
  nickname: string | null
  memberId: string | null
}

export interface CommunityMessage {
  id: string
  memberId: string
  nickname: string
  content: string
  createdAt: string
  isMine: boolean
}

export interface CommunityMessagesPage {
  messages: CommunityMessage[]
  hasMore: boolean
}
