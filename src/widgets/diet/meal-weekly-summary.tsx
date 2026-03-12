"use client"

import { useMemo } from "react"
import { Flame } from "lucide-react"
import { useMyMeals } from "@/features/diet"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from "@/shared/ui"

function getWeekRange(): { from: string; to: string; days: string[] } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // 월요일 시작
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d.toISOString().split("T")[0])
  }

  return {
    from: days[0],
    to: days[6],
    days,
  }
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]

export function MealWeeklySummary() {
  const { from, to, days } = useMemo(() => getWeekRange(), [])
  const { data: meals, isLoading } = useMyMeals(from, to)

  // 일별 칼로리 합산
  const dailyCalories = useMemo(() => {
    const map = new Map<string, number>()
    for (const meal of meals ?? []) {
      const current = map.get(meal.date) ?? 0
      map.set(meal.date, current + (meal.calories ?? 0))
    }
    return map
  }, [meals])

  // 주간 평균 탄단지
  const weeklyAvg = useMemo(() => {
    if (!meals?.length) return { carbs: 0, protein: 0, fat: 0 }
    const daysWithMeals = new Set(meals.map((m) => m.date)).size || 1
    const totals = meals.reduce(
      (acc, m) => ({
        carbs: acc.carbs + (m.carbs ?? 0),
        protein: acc.protein + (m.protein ?? 0),
        fat: acc.fat + (m.fat ?? 0),
      }),
      { carbs: 0, protein: 0, fat: 0 }
    )
    return {
      carbs: totals.carbs / daysWithMeals,
      protein: totals.protein / daysWithMeals,
      fat: totals.fat / daysWithMeals,
    }
  }, [meals])

  const today = new Date().toISOString().split("T")[0]

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <Flame className="size-4 text-primary" />
          </div>
          주간 영양 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            {/* 일별 칼로리 그리드 */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {days.map((day, i) => {
                const cal = dailyCalories.get(day) ?? 0
                const isToday = day === today
                const isFuture = day > today
                return (
                  <div key={day} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{DAY_LABELS[i]}</p>
                    <div
                      className={`rounded-lg p-2 text-xs font-medium ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isFuture
                            ? "bg-muted/30 text-muted-foreground/50"
                            : cal > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isFuture ? "-" : cal > 0 ? `${cal}` : "0"}
                    </div>
                    {!isFuture && cal > 0 && (
                      <p className="text-[10px] text-muted-foreground">kcal</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 주간 평균 탄단지 */}
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted p-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">평균 탄수화물</p>
                <p className="text-sm font-semibold">{weeklyAvg.carbs.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">평균 단백질</p>
                <p className="text-sm font-semibold">{weeklyAvg.protein.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">평균 지방</p>
                <p className="text-sm font-semibold">{weeklyAvg.fat.toFixed(1)}g</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
