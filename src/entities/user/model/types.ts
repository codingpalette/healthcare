export type UserRole = "member" | "trainer"

export interface Profile {
  id: string
  role: UserRole
  name: string
  phone: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateMemberRequest {
  email: string
  password: string
  name: string
  phone?: string
}

export interface UpdateMemberRequest {
  name?: string
  phone?: string
}
