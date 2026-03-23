"use client"

import type { Profile } from "@/entities/user"
import { AttendanceCalendar } from "@/widgets/attendance/attendance-calendar"
import { AttendanceTodayTable } from "@/widgets/attendance/attendance-today-table"

interface AttendancePageProps {
  profile: Profile
}

// 출석 관리 페이지 - 역할에 따라 다른 뷰 렌더링
export function AttendancePage({ profile }: AttendancePageProps) {
  if (profile.role !== "member") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">출석 관리</h2>
          <p className="text-muted-foreground">회원들의 출석 현황을 확인하세요</p>
        </div>
        <AttendanceTodayTable />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">내 출석 기록</h2>
        <p className="text-muted-foreground">월별 출석 현황을 확인하세요</p>
      </div>
      <AttendanceCalendar />
    </div>
  )
}
