"use client"

import Link from "next/link"
import { UtensilsCrossed, Coffee, Sun, Moon, Apple } from "lucide-react"
import type { MealType } from "@/entities/meal"
import { useMyMeals } from "@/features/diet"

import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 식단 시간대 목록
const MEAL_SLOTS: { value: MealType; label: string; icon: typeof Coffee }[] = [
  { value: "breakfast", label: "아침", icon: Coffee },
  { value: "lunch", label: "점심", icon: Sun },
  { value: "dinner", label: "저녁", icon: Moon },
  { value: "snack", label: "간식", icon: Apple },
]

// 오늘의 식단 카드 위젯
export function TodayDietCard() {
  const today = new Date().toISOString().split("T")[0]
  const { data: meals } = useMyMeals(today, today)

  // 식사 유형별 기록 여부 및 칼로리 합산
  const mealMap = new Map<MealType, number>()
  for (const meal of meals ?? []) {
    const current = mealMap.get(meal.mealType) ?? 0
    mealMap.set(meal.mealType, current + (meal.calories ?? 0))
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <UtensilsCrossed className="size-4 text-primary" />
          </div>
          오늘의 식단
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {MEAL_SLOTS.map((slot) => {
            const cal = mealMap.get(slot.value)
            const recorded = cal !== undefined
            return (
              <div
                key={slot.value}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-3 transition-colors hover:opacity-80",
                  recorded ? "bg-primary/10" : "bg-muted"
                )}
              >
                <slot.icon className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {recorded ? `${cal}kcal` : "미기록"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <Link
          href="/diet"
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full bg-primary hover:bg-primary/90"
          )}
        >
          <UtensilsCrossed className="size-4" />
          식단 기록하기
        </Link>
      </CardContent>
    </Card>
  )
}
