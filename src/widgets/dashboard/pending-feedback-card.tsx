"use client"

import { ClipboardCheck, Camera, Dumbbell } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/shared/ui"

// 미확인 인증글 카드 위젯
export function PendingFeedbackCard() {
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
            0건
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 인증글 유형별 카운트 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <Camera className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">식단 인증</p>
              <p className="text-xs text-muted-foreground">0건 대기중</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <Dumbbell className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">운동 인증</p>
              <p className="text-xs text-muted-foreground">0건 대기중</p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          확인할 인증글이 없습니다
        </p>
      </CardContent>
    </Card>
  )
}
