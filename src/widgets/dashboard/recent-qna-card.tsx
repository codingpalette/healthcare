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
          <div className="rounded-lg bg-emerald-100 p-2">
            <MessageCircle className="size-4 text-emerald-600" />
          </div>
          최근 Q&A
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-50 py-8">
          <MessageCircle className="size-10 text-emerald-300" />
          <p className="mt-2 text-sm font-medium text-emerald-700">
            아직 질문이 없습니다
          </p>
          <p className="text-xs text-emerald-500">
            트레이너에게 궁금한 점을 물어보세요
          </p>
        </div>
        <Link
          href="/qna"
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full bg-emerald-500 hover:bg-emerald-600"
          )}
        >
          질문하기
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
