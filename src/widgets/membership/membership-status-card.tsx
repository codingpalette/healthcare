"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { useMyMembership } from "@/features/membership-management"

export function MembershipStatusCard() {
  const { data: membership, isLoading } = useMyMembership()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">회원권</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  if (!membership) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">회원권</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">회원권이 설정되지 않았습니다.</p>
        </CardContent>
      </Card>
    )
  }

  const today = new Date()
  const endDate = new Date(membership.endDate)
  const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = diffDays <= 7 && diffDays > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">회원권</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={`text-2xl font-bold ${isExpiringSoon ? "text-orange-500" : ""}`}>
          D-{diffDays > 0 ? diffDays : 0}
        </p>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>시작: {membership.startDate}</p>
          <p>종료: {membership.endDate}</p>
        </div>
        {isExpiringSoon && (
          <p className="text-xs text-orange-500 font-medium">만료가 임박했습니다</p>
        )}
      </CardContent>
    </Card>
  )
}
