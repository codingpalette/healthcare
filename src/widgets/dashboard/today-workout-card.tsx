"use client"

import Link from "next/link"
import { Dumbbell, Flame, Timer, TrendingUp } from "lucide-react"
import { useMyWorkouts } from "@/features/workout"

import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

// 오늘의 운동 카드 위젯
export function TodayWorkoutCard() {
  const today = formatLocalDateValue(new Date())
  const { data: workouts } = useMyWorkouts(today, today)

  const totals = (workouts ?? []).reduce(
    (acc, workout) => ({
      calories: acc.calories + (workout.caloriesBurned ?? 0),
      duration: acc.duration + (workout.durationMinutes ?? 0),
      sets: acc.sets + (workout.sets ?? 0),
    }),
    { calories: 0, duration: 0, sets: 0 }
  )

  const hasWorkouts = (workouts?.length ?? 0) > 0

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <Dumbbell className="size-4 text-primary" />
          </div>
          오늘의 운동
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 운동 통계 요약 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-xl bg-muted p-3">
            <Flame className="size-5 text-primary" />
            <span className="mt-1 text-lg font-bold">{totals.calories}</span>
            <span className="text-xs text-muted-foreground">kcal</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-muted p-3">
            <Timer className="size-5 text-primary" />
            <span className="mt-1 text-lg font-bold">{totals.duration}</span>
            <span className="text-xs text-muted-foreground">분</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-muted p-3">
            <TrendingUp className="size-5 text-primary" />
            <span className="mt-1 text-lg font-bold">{totals.sets}</span>
            <span className="text-xs text-muted-foreground">세트</span>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {hasWorkouts
            ? `${workouts?.length ?? 0}개의 운동 기록이 있습니다`
            : "오늘 기록된 운동이 없습니다"}
        </p>
        <Link
          href="/workout"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full"
          )}
        >
          <Dumbbell className="size-4" />
          운동 기록하기
        </Link>
      </CardContent>
    </Card>
  )
}
