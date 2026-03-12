"use client"

import Link from "next/link"
import { MessageCircleQuestion, ArrowRight } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  buttonVariants,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 미답변 Q&A 카드 위젯
export function UnansweredQnaCard() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-rose-100 p-2">
              <MessageCircleQuestion className="size-4 text-rose-600" />
            </div>
            미답변 Q&A
          </CardTitle>
          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
            0건
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-rose-50 py-6">
          <MessageCircleQuestion className="size-10 text-rose-300" />
          <p className="mt-2 text-sm font-medium text-rose-700">
            답변할 질문이 없습니다
          </p>
        </div>
        <Link
          href="/qna"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full border-rose-200 text-rose-600 hover:bg-rose-50"
          )}
        >
          Q&A 목록 보기
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
