"use client"

import Link from "next/link"
import { UtensilsCrossed, Coffee, Sun, Moon, Apple } from "lucide-react"

import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 식단 시간대 목록
const MEAL_SLOTS = [
  { label: "아침", icon: Coffee, color: "text-orange-500", bg: "bg-orange-50" },
  { label: "점심", icon: Sun, color: "text-yellow-500", bg: "bg-yellow-50" },
  { label: "저녁", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-50" },
  { label: "간식", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
] as const

// 오늘의 식단 카드 위젯
export function TodayDietCard() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-orange-100 p-2">
            <UtensilsCrossed className="size-4 text-orange-600" />
          </div>
          오늘의 식단
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {MEAL_SLOTS.map((slot) => (
            <div
              key={slot.label}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3 transition-colors hover:opacity-80",
                slot.bg
              )}
            >
              <slot.icon className={cn("size-5", slot.color)} />
              <div>
                <p className="text-sm font-medium">{slot.label}</p>
                <p className="text-xs text-muted-foreground">미기록</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/diet"
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full bg-orange-500 hover:bg-orange-600"
          )}
        >
          <UtensilsCrossed className="size-4" />
          식단 기록하기
        </Link>
      </CardContent>
    </Card>
  )
}
