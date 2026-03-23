export type UserRole = "member" | "trainer" | "admin"

export interface Profile {
  id: string
  role: UserRole
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  trainerId: string | null
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

export interface UpdateRoleRequest {
  role: UserRole
}
