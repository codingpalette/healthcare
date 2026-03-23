"use client"

import type { Profile } from "@/entities/user"
import { MealDailyList } from "@/widgets/diet/meal-daily-list"
import { MealWeeklySummary } from "@/widgets/diet/meal-weekly-summary"
import { MealMemberTable } from "@/widgets/diet/meal-member-table"

interface DietPageProps {
  profile: Profile
}

// 식단 관리 페이지 - 역할에 따라 다른 뷰 렌더링
export function DietPage({ profile }: DietPageProps) {
  if (profile.role !== "member") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">식단 관리</h2>
          <p className="text-muted-foreground">회원들의 식단 기록을 확인하세요</p>
        </div>
        <MealMemberTable />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">내 식단 기록</h2>
        <p className="text-muted-foreground">식단을 기록하고 영양 섭취를 관리하세요</p>
      </div>
      <MealWeeklySummary />
      <MealDailyList />
    </div>
  )
}
