"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signUp } from "@/features/auth/api"
import type { UserRole } from "@/entities/user"
import { Button } from "@/shared/ui/button"

export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRole>("member")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signUp({ email, password, name, role })
      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-bold">회원가입</h1>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          이름
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          placeholder="이름을 입력하세요"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="signup-email" className="text-sm font-medium">
          이메일
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          placeholder="이메일을 입력하세요"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="signup-password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded-md border px-3 py-2"
          placeholder="비밀번호를 입력하세요 (6자 이상)"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">역할</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="member"
              checked={role === "member"}
              onChange={() => setRole("member")}
            />
            회원
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="trainer"
              checked={role === "trainer"}
              onChange={() => setRole("trainer")}
            />
            트레이너
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "가입 중..." : "회원가입"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <a href="/login" className="text-blue-500 hover:underline">
          로그인
        </a>
      </p>
    </form>
  )
}
