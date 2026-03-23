"use client"

import type { Profile } from "@/entities/user"
import { WorkoutDailyList } from "@/widgets/workout/workout-daily-list"
import { WorkoutMemberTable } from "@/widgets/workout/workout-member-table"
import { WorkoutWeeklySummary } from "@/widgets/workout/workout-weekly-summary"

interface WorkoutPageProps {
  profile: Profile
}

// 운동 관리 페이지 - 역할에 따라 다른 뷰 렌더링
export function WorkoutPage({ profile }: WorkoutPageProps) {
  if (profile.role !== "member") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">운동 관리</h2>
          <p className="text-muted-foreground">회원들의 운동 인증과 피드백을 관리하세요</p>
        </div>
        <WorkoutMemberTable />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">내 운동 기록</h2>
        <p className="text-muted-foreground">운동 기록을 남기고 주간 진행 상황을 확인하세요</p>
      </div>
      <WorkoutWeeklySummary />
      <WorkoutDailyList />
    </div>
  )
}
