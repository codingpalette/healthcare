"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield } from "lucide-react"
import { Button } from "@/shared/ui/button"

export function AdminSetupForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/admin-setup/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `${email}@health.app`, password, name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "관리자 계정 생성에 실패했습니다")
      }

      router.push("/login")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="size-8 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">관리자 계정 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          시스템을 사용하려면 먼저 관리자 계정을 만들어야 합니다.
          <br />
          관리자는 모든 회원과 트레이너를 관리할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="admin-name" className="text-sm font-medium">
            이름
          </label>
          <input
            id="admin-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="관리자 이름"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-email" className="text-sm font-medium">
            이메일 (아이디)
          </label>
          <div className="flex items-center rounded-xl border focus-within:ring-2 focus-within:ring-primary/30">
            <input
              id="admin-email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin"
              className="w-full rounded-l-xl bg-background px-4 py-3 text-sm outline-none"
            />
            <span className="shrink-0 border-l bg-muted px-3 py-3 text-sm text-muted-foreground rounded-r-xl">
              @health.app
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="admin-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-confirm" className="text-sm font-medium">
            비밀번호 확인
          </label>
          <input
            id="admin-confirm"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 재입력"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "생성 중..." : "관리자 계정 만들기"}
        </Button>
      </form>
    </div>
  )
}
