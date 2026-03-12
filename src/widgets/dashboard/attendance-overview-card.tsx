"use client"

import Link from "next/link"
import { CalendarCheck, Users, Activity, ArrowRight } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  buttonVariants,
  Skeleton,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"
import { useTodayAttendance } from "@/features/attendance"

// 트레이너용 출석 현황 카드
export function AttendanceOverviewCard() {
  const { data: todayAttendance, isLoading } = useTodayAttendance()

  const totalToday = todayAttendance?.length ?? 0
  const workingOut = todayAttendance?.filter((a) => !a.checkOutAt).length ?? 0

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-violet-100 p-2">
            <CalendarCheck className="size-4 text-violet-600" />
          </div>
          출석 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl bg-violet-50 p-4">
            <Users className="size-6 text-violet-500" />
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-8" />
            ) : (
              <span className="mt-2 text-2xl font-bold text-violet-700">{totalToday}</span>
            )}
            <span className="text-xs text-violet-600">오늘 출석</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-green-50 p-4">
            <Activity className="size-6 text-green-500" />
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-8" />
            ) : (
              <span className="mt-2 text-2xl font-bold text-green-700">{workingOut}</span>
            )}
            <span className="text-xs text-green-600">운동 중</span>
          </div>
        </div>
        <Link
          href="/attendance"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full border-violet-200 text-violet-600 hover:bg-violet-50"
          )}
        >
          출석 관리
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
