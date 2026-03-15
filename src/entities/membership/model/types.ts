export interface Membership {
  id: string
  memberId: string
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  memo: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateMembershipRequest {
  memberId: string
  startDate: string
  endDate: string
  memo?: string
}

export interface UpdateMembershipRequest {
  startDate?: string
  endDate?: string
  memo?: string
}
