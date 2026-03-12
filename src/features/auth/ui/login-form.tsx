"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "@/features/auth/api"
import { Button } from "@/shared/ui/button"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signIn({ email, password })
      router.push("/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-bold">로그인</h1>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          placeholder="이메일을 입력하세요"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          placeholder="비밀번호를 입력하세요"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "로그인 중..." : "로그인"}
      </Button>

      {/* <p className="text-center text-sm text-gray-500">
        계정이 없으신가요?{" "}
        <a href="/signup" className="text-blue-500 hover:underline">
          회원가입
        </a>
      </p> */}
    </form>
  )
}
