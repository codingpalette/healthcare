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
  { label: "아침", icon: Coffee },
  { label: "점심", icon: Sun },
  { label: "저녁", icon: Moon },
  { label: "간식", icon: Apple },
] as const

// 오늘의 식단 카드 위젯
export function TodayDietCard() {
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
          {MEAL_SLOTS.map((slot) => (
            <div
              key={slot.label}
              className="flex items-center gap-3 rounded-xl bg-muted p-3 transition-colors hover:opacity-80"
            >
              <slot.icon className="size-5 text-primary" />
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
