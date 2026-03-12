"use client"

import Link from "next/link"
import { Wrench, ArrowRight } from "lucide-react"

import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 기구 가이드 바로가기 카드 위젯
export function EquipmentShortcutCard() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <Wrench className="size-4 text-primary" />
          </div>
          기구 가이드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl bg-muted p-4">
          <p className="text-sm font-medium text-foreground">
            운동 기구 사용법을 확인하세요
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            올바른 자세와 사용법으로 효과적인 운동을 하세요
          </p>
        </div>
        <Link
          href="/equipment"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full"
          )}
        >
          가이드 보기
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
