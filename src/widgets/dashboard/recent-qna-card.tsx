"use client"

import Link from "next/link"
import { MessageCircle, ArrowRight } from "lucide-react"

import {
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 최근 Q&A 카드 위젯
export function RecentQnaCard() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <MessageCircle className="size-4 text-primary" />
          </div>
          최근 Q&A
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted py-8">
          <MessageCircle className="size-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            아직 질문이 없습니다
          </p>
          <p className="text-xs text-muted-foreground">
            트레이너에게 궁금한 점을 물어보세요
          </p>
        </div>
        <Link
          href="/chat"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full"
          )}
        >
          질문하기
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
