"use client"

import type { Profile } from "@/entities/user"
import { PendingFeedbackCard } from "@/widgets/dashboard/pending-feedback-card"
import { UnansweredQnaCard } from "@/widgets/dashboard/unanswered-qna-card"
import { MemberOverviewCard } from "@/widgets/dashboard/member-overview-card"
import { AttendanceOverviewCard } from "@/widgets/dashboard/attendance-overview-card"
import { RecentNoticesCard } from "@/widgets/dashboard/recent-notices-card"

interface TrainerDashboardProps {
  profile: Profile
}

// 트레이너 대시보드 페이지 컴포넌트
export function TrainerDashboard({ profile }: TrainerDashboardProps) {
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AttendanceOverviewCard />
        <PendingFeedbackCard />
        <UnansweredQnaCard />
        <RecentNoticesCard />
        <MemberOverviewCard />
      </div>
    </div>
  )
}
