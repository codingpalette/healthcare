"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, Input, Label } from "@/shared/ui"
import type { Profile } from "@/entities/user"
import { useUpdateMember } from "@/features/member-management/model/use-members"

interface EditMemberFormProps {
  member: Profile
  onSuccess?: () => void
}

export function EditMemberForm({ member, onSuccess }: EditMemberFormProps) {
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone ?? "")

  const { mutate, isPending } = useUpdateMember()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    mutate(
      {
        memberId: member.id,
        data: { name: name.trim(), phone: phone.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("회원 정보가 수정되었습니다")
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
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "수정 중..." : "수정 완료"}
      </Button>
    </form>
  )
}
