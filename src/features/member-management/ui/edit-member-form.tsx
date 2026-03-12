"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, Input, Label } from "@/shared/ui"
import type { Profile, UserRole } from "@/entities/user"
import { useUpdateMember, useUpdateRole } from "@/features/member-management/model/use-members"

interface EditMemberFormProps {
  member: Profile
  currentUserId: string
  onSuccess?: () => void
}

export function EditMemberForm({ member, currentUserId, onSuccess }: EditMemberFormProps) {
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone ?? "")
  const [role, setRole] = useState<UserRole>(member.role)

  const { mutate, isPending } = useUpdateMember()
  const { mutate: changeRole, isPending: isRolePending } = useUpdateRole()
  const canChangeRole = member.id !== currentUserId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    // 권한 변경이 있으면 먼저 처리
    if (canChangeRole && role !== member.role) {
      changeRole(
        { memberId: member.id, data: { role } },
        {
          onError: (error) => toast.error(error.message),
        }
      )
    }

    mutate(
      {
        memberId: member.id,
        data: { name: name.trim(), phone: phone.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("유저 정보가 수정되었습니다")
          onSuccess?.()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">이름</Label>
        <Input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
        />
      </div>
      {canChangeRole && (
        <div className="space-y-2">
          <Label htmlFor="edit-role">권한</Label>
          <select
            id="edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="member">회원</option>
            <option value="trainer">트레이너</option>
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="edit-phone">전화번호 (선택)</Label>
        <Input
          id="edit-phone"
          type="tel"
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending || isRolePending}>
        {isPending || isRolePending ? "수정 중..." : "수정 완료"}
      </Button>
    </form>
  )
}
