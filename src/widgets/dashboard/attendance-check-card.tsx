"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CalendarCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Skeleton,
} from "@/shared/ui"
import { useCheckIn, useCheckOut, useMyAttendance } from "@/features/attendance"

// 운동 경과 시간 계산
function formatDuration(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000)
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

// 이번 주 월요일 구하기
function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

export function AttendanceCheckCard() {
  const weekStart = getWeekStart()
  const { data: weekAttendance, isLoading } = useMyAttendance(weekStart)
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()
  const [now, setNow] = useState(new Date())

  // 운동 중일 때 타이머 업데이트
  const activeRecord = weekAttendance?.find(
    (a) => {
      const checkInDate = new Date(a.checkInAt)
      const today = new Date()
      return (
        checkInDate.toDateString() === today.toDateString() &&
        !a.checkOutAt
      )
    }
  )

  useEffect(() => {
    if (!activeRecord) return
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [activeRecord])

  // 오늘 완료된 기록
  const todayCompleted = weekAttendance?.filter((a) => {
    const checkInDate = new Date(a.checkInAt)
    const today = new Date()
    return checkInDate.toDateString() === today.toDateString() && a.checkOutAt
  }) ?? []

  // 이번 주 출석 일수 (고유 날짜 수)
  const weekDays = new Set(
    (weekAttendance ?? []).map((a) => new Date(a.checkInAt).toDateString())
  ).size

  const isPending = checkInMutation.isPending || checkOutMutation.isPending

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-violet-100 p-2">
            <CalendarCheck className="size-4 text-violet-600" />
          </div>
          출석 체크
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : activeRecord ? (
          // 운동 중 상태
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
              <Clock className="size-6 text-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-green-700">운동 중</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatDuration(activeRecord.checkInAt, now.toISOString())}
                </p>
              </div>
            </div>
            <Button
              className="w-full bg-red-500 hover:bg-red-600"
              onClick={() => checkOutMutation.mutate()}
              disabled={isPending}
            >
              <CheckCircle2 className="size-4" />
              체크아웃
            </Button>
          </div>
        ) : todayCompleted.length > 0 ? (
          // 오늘 운동 완료
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4">
              <CheckCircle2 className="size-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-700">오늘 운동 완료</p>
                <p className="text-lg font-bold text-blue-800">
                  {todayCompleted.map((a) => formatDuration(a.checkInAt, a.checkOutAt)).join(", ")}
                </p>
              </div>
            </div>
            <Button
              className="w-full bg-violet-500 hover:bg-violet-600"
              onClick={() => checkInMutation.mutate()}
              disabled={isPending}
            >
              <CalendarCheck className="size-4" />
              다시 체크인
            </Button>
          </div>
        ) : (
          // 미체크인
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
              <CalendarCheck className="size-6 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">아직 체크인하지 않았습니다</p>
                <p className="text-xs text-gray-400">버튼을 눌러 운동을 시작하세요</p>
              </div>
            </div>
            <Button
              className="w-full bg-violet-500 hover:bg-violet-600"
              onClick={() => checkInMutation.mutate()}
              disabled={isPending}
            >
              <CalendarCheck className="size-4" />
              체크인
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
          <span className="text-sm text-violet-600">이번 주 {weekDays}일 출석</span>
          <Link href="/attendance" className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700">
            출석 기록
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
