"use client"

import Link from "next/link"
import { ClipboardCheck, Camera, Dumbbell, MessagesSquare } from "lucide-react"
import { useTodayMeals } from "@/features/diet"
import { useTodayWorkouts } from "@/features/workout"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  buttonVariants,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 미확인 인증글 카드 위젯
export function PendingFeedbackCard() {
  const { data: meals, isLoading } = useTodayMeals()
  const { data: workouts, isLoading: isWorkoutLoading } = useTodayWorkouts()
  const pendingDietCount = meals?.length ?? 0
  const pendingWorkoutCount = workouts?.length ?? 0
  const totalPendingCount = pendingDietCount + pendingWorkoutCount
  const isLoadingAny = isLoading || isWorkoutLoading

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-primary/10 p-2">
              <ClipboardCheck className="size-4 text-primary" />
            </div>
            미확인 인증글
          </CardTitle>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
            {isLoadingAny ? "집계 중" : `${totalPendingCount}건`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <Camera className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">식단 인증</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingAny ? "집계 중" : `${pendingDietCount}건 대기중`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <Dumbbell className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">운동 인증</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingAny ? "집계 중" : `${pendingWorkoutCount}건 대기중`}
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {isLoadingAny
            ? "오늘 인증글 수를 확인하고 있습니다"
            : totalPendingCount > 0
              ? "식단과 운동 메뉴에서 회원 인증 내역을 확인할 수 있습니다"
              : "확인할 인증글이 없습니다"}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/diet"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "w-full"
            )}
          >
            식단 인증 확인
          </Link>
          <Link
            href="/workout"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "w-full"
            )}
          >
            운동 인증 확인
          </Link>
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "w-full"
            )}
          >
            <MessagesSquare className="size-4" />
            관리톡
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
