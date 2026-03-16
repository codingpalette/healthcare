"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button, Input, Label } from "@/shared/ui"
import { changePassword } from "@/features/auth/api"

const AUTH_ERROR_MAP: Record<string, string> = {
  "New password should be different from the old password.":
    "새 비밀번호는 기존 비밀번호와 달라야 합니다.",
  "Password should be at least 6 characters.":
    "비밀번호는 6자 이상이어야 합니다.",
}

function translateAuthError(message: string): string {
  return AUTH_ERROR_MAP[message] ?? "비밀번호 변경에 실패했습니다"
}

export function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다")
      return
    }

    setIsPending(true)
    try {
      await changePassword(newPassword)
      toast.success("비밀번호가 변경되었습니다")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : ""
      toast.error(translateAuthError(message))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">새 비밀번호</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="6자 이상 입력"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNewPassword(e.target.value)
          }
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">비밀번호 확인</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="비밀번호 재입력"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setConfirmPassword(e.target.value)
          }
          required
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  )
}
