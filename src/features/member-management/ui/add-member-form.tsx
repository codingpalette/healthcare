"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, Input, Label } from "@/shared/ui"
import { resolveEmail } from "@/shared/lib/resolve-email"
import { useCreateMember } from "@/features/member-management/model/use-members"

interface AddMemberFormProps {
  onSuccess?: () => void
}

export function AddMemberForm({ onSuccess }: AddMemberFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const { mutate, isPending } = useCreateMember()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 클라이언트 유효성 검증
    const resolvedEmail = resolveEmail(email)
    if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      toast.error("올바른 아이디 형식을 입력해주세요")
      return
    }
    if (!password || password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다")
      return
    }
    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    mutate(
      { email: resolvedEmail, password, name: name.trim(), phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("유저가 추가되었습니다")
          setEmail("")
          setPassword("")
          setName("")
          setPhone("")
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
        <Label htmlFor="email">아이디</Label>
        <Input
          id="email"
          type="text"
          placeholder="아이디 (예: member1)"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="6자 이상"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          type="text"
          placeholder="홍길동"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">전화번호 (선택)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "추가 중..." : "유저 추가"}
      </Button>
    </form>
  )
}
