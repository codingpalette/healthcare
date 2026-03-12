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
