"use client"

import { useState, useMemo } from "react"
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/shared/ui"
import { useMyAttendance } from "@/features/attendance"

// 해당 월의 시작/끝 날짜
function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString()
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return { from, to }
}

// 운동 시간 평균 계산
function calcAvgDuration(records: { checkInAt: string; checkOutAt: string | null }[]): string {
  const completed = records.filter((r) => r.checkOutAt)
  if (completed.length === 0) return "-"
  const totalMinutes = completed.reduce((sum, r) => {
    const diff = new Date(r.checkOutAt!).getTime() - new Date(r.checkInAt).getTime()
    return sum + diff / 60_000
  }, 0)
  const avg = Math.round(totalMinutes / completed.length)
  const hours = Math.floor(avg / 60)
  const minutes = avg % 60
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

export function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { from, to } = getMonthRange(year, month)
  const { data: attendance } = useMyAttendance(from, to)

  // 출석 날짜 Set
  const attendanceDates = useMemo(() => {
    return new Set(
      (attendance ?? []).map((a) =>
        new Date(a.checkInAt).toLocaleDateString("ko-KR")
      )
    )
  }, [attendance])

  // 달력 생성
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array.from({ length: firstDay }, () => null)

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthLabel = currentDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  })

  const attendanceDays = attendanceDates.size
  const avgDuration = calcAvgDuration(attendance ?? [])

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-violet-100 p-2">
            <CalendarCheck className="size-4 text-violet-600" />
          </div>
          출석 달력
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">{monthLabel}</span>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* 달력 */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-1 font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {weeks.flat().map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="py-2" />
            }
            const dateStr = new Date(year, month, day).toLocaleDateString("ko-KR")
            const isAttended = attendanceDates.has(dateStr)
            const isToday = new Date().toLocaleDateString("ko-KR") === dateStr

            return (
              <div
                key={`day-${day}`}
                className={`relative flex items-center justify-center rounded-lg py-2 text-sm ${
                  isToday ? "font-bold ring-1 ring-violet-300" : ""
                } ${isAttended ? "bg-violet-100 text-violet-700 font-medium" : ""}`}
              >
                {day}
                {isAttended && (
                  <span className="absolute bottom-0.5 size-1 rounded-full bg-violet-500" />
                )}
              </div>
            )
          })}
        </div>

        {/* 월 통계 */}
        <div className="flex items-center justify-around rounded-lg bg-violet-50 px-3 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-violet-700">{attendanceDays}일</p>
            <p className="text-xs text-violet-500">이번 달 출석</p>
          </div>
          <div className="h-8 w-px bg-violet-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-violet-700">{avgDuration}</p>
            <p className="text-xs text-violet-500">평균 운동 시간</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
