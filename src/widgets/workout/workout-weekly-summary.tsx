"use client"

import { useMemo } from "react"
import { BarChart3, Flame, Timer, Trophy } from "lucide-react"
import { useMyWorkouts } from "@/features/workout"
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui"

function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getWeekRange() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const days = Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday)
    current.setDate(monday.getDate() + index)
    return formatLocalDateValue(current)
  })

  return {
    from: days[0],
    to: days[6],
    days,
  }
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]

export function WorkoutWeeklySummary() {
  const { from, to, days } = useMemo(() => getWeekRange(), [])
  const today = formatLocalDateValue(new Date())
  const { data: workouts, isLoading } = useMyWorkouts(from, to)

  const summary = useMemo(() => {
    const byDay = new Map<string, { duration: number; calories: number; sets: number; count: number }>()

    for (const workout of workouts ?? []) {
      const current = byDay.get(workout.date) ?? { duration: 0, calories: 0, sets: 0, count: 0 }
      byDay.set(workout.date, {
        duration: current.duration + (workout.durationMinutes ?? 0),
        calories: current.calories + (workout.caloriesBurned ?? 0),
        sets: current.sets + (workout.sets ?? 0),
        count: current.count + 1,
      })
    }

    const totalDuration = Array.from(byDay.values()).reduce((acc, day) => acc + day.duration, 0)
    const totalCalories = Array.from(byDay.values()).reduce((acc, day) => acc + day.calories, 0)
    const totalSets = Array.from(byDay.values()).reduce((acc, day) => acc + day.sets, 0)
    const bestDay = days.reduce<{ date: string; duration: number } | null>((best, day) => {
      const duration = byDay.get(day)?.duration ?? 0
      if (!best || duration > best.duration) return { date: day, duration }
      return best
    }, null)

    return {
      byDay,
      totalDuration,
      totalCalories,
      totalSets,
      bestDay,
    }
  }, [days, workouts])

  const maxDuration = Math.max(...days.map((day) => summary.byDay.get(day)?.duration ?? 0), 1)

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="size-4 text-primary" />
          </div>
          주간 운동 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="size-4 text-primary" />
                  총 운동 시간
                </p>
                <p className="mt-2 text-2xl font-semibold">{summary.totalDuration}분</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="size-4 text-primary" />
                  총 소모 칼로리
                </p>
                <p className="mt-2 text-2xl font-semibold">{summary.totalCalories}kcal</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="size-4 text-primary" />
                  최다 운동일
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {summary.bestDay?.duration
                    ? `${new Date(`${summary.bestDay.date}T00:00:00`).toLocaleDateString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                    })} · ${summary.bestDay.duration}분`
                    : "아직 기록 없음"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">일별 운동 시간 차트</h3>
                  <p className="text-sm text-muted-foreground">이번 주 운동량을 한눈에 확인하세요.</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  총 {summary.totalSets}세트
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-3">
                {days.map((day, index) => {
                  const duration = summary.byDay.get(day)?.duration ?? 0
                  const calories = summary.byDay.get(day)?.calories ?? 0
                  const isFuture = day > today
                  const isToday = day === today
                  const height = isFuture ? 10 : Math.max(Math.round((duration / maxDuration) * 120), duration > 0 ? 24 : 10)

                  return (
                    <div key={day} className="flex flex-col items-center gap-2">
                      <div className="flex h-36 items-end">
                        <div
                          className={`w-10 rounded-t-xl transition-all ${
                            isToday
                              ? "bg-primary"
                              : isFuture
                                ? "bg-muted/50"
                                : duration > 0
                                  ? "bg-primary/35"
                                  : "bg-muted"
                          }`}
                          style={{ height }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">{DAY_LABELS[index]}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isFuture ? "-" : `${duration}분`}
                        </p>
                        {!isFuture && calories > 0 && (
                          <p className="text-[10px] text-muted-foreground">{calories}kcal</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
