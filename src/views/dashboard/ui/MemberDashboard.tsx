"use client"

import type { Profile } from "@/entities/user"
import {
  EquipmentShortcutCard,
  RecentQnaCard,
  TodayDietCard,
  TodayWorkoutCard,
} from "@/widgets/dashboard"
import { AttendanceCheckCard } from "@/widgets/dashboard/attendance-check-card"
import { MembershipStatusCard } from "@/widgets/membership"

interface MemberDashboardProps {
  profile: Profile
}

// 회원 대시보드 페이지 컴포넌트
export function MemberDashboard({ profile }: MemberDashboardProps) {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">안녕하세요, {profile.name}님</h2>
        <p className="text-muted-foreground">{today}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AttendanceCheckCard />
        <MembershipStatusCard />
        <TodayDietCard />
        <TodayWorkoutCard />
        <RecentQnaCard />
        <EquipmentShortcutCard />
      </div>
    </div>
  )
}
