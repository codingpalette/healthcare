"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "@/features/auth/api"
import { resolveEmail } from "@/shared/lib/resolve-email"
import { Button } from "@/shared/ui/button"
import { generateDeviceFingerprint, storeDeviceId } from "@/shared/lib/device-fingerprint"
import { registerDevice, DeviceLimitError, DeviceLimitScreen, type Device } from "@/entities/device"
import { parseDeviceInfo } from "../api/auth-api"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [limitDevices, setLimitDevices] = useState<Device[] | null>(null)

  const attemptDeviceRegistration = async () => {
    const fingerprint = generateDeviceFingerprint()
    const deviceInfo = parseDeviceInfo()
    const device = await registerDevice({ ...deviceInfo, deviceFingerprint: fingerprint })
    storeDeviceId(device.id)
    router.push("/")
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signIn({ email: resolveEmail(email), password })
      try {
        await attemptDeviceRegistration()
      } catch (e: unknown) {
        if (e instanceof DeviceLimitError) {
          setLimitDevices(e.devices)
        } else {
          setError(e instanceof Error ? e.message : "기기 등록에 실패했습니다")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  // 기기 한도 초과 시 기기 선택 화면 표시
  if (limitDevices) {
    return (
      <DeviceLimitScreen
        devices={limitDevices}
        onDeviceRemoved={async () => {
          try {
            await attemptDeviceRegistration()
          } catch (e: unknown) {
            if (e instanceof DeviceLimitError) {
              setLimitDevices(e.devices)
            }
          }
        }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-bold">로그인</h1>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          아이디
        </label>
        <input
          id="email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border px-3 py-2"
          placeholder="아이디를 입력하세요"
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
