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
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageCircleQuestion className="size-4 text-primary" />
            </div>
            미답변 Q&A
          </CardTitle>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
            0건
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted py-6">
          <MessageCircleQuestion className="size-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            답변할 질문이 없습니다
          </p>
        </div>
        <Link
          href="/qna"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full"
          )}
        >
          Q&A 목록 보기
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
