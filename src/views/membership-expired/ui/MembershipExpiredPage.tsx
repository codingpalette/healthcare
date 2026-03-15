"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { signOut } from "@/features/auth"
import type { Membership } from "@/entities/membership"
import { getMyMembership } from "@/entities/membership"

export function MembershipExpiredPage() {
  const router = useRouter()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyMembership()
      .then(setMembership)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  if (loading) return null

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {membership ? "회원권이 만료되었습니다" : "회원권이 설정되지 않았습니다"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {membership ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>시작일: {membership.startDate}</p>
            <p>종료일: {membership.endDate}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 회원권이 설정되지 않았습니다.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          서비스를 이용하려면 트레이너에게 문의하세요.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
