"use client"

import Link from "next/link"
import { Users, UserCheck, ArrowRight } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  buttonVariants,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

// 회원 현황 카드 위젯
export function MemberOverviewCard() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-teal-100 p-2">
            <Users className="size-4 text-teal-600" />
          </div>
          회원 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl bg-teal-50 p-4">
            <Users className="size-6 text-teal-500" />
            <span className="mt-2 text-2xl font-bold text-teal-700">0</span>
            <span className="text-xs text-teal-600">전체 회원</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-4">
            <UserCheck className="size-6 text-emerald-500" />
            <span className="mt-2 text-2xl font-bold text-emerald-700">0</span>
            <span className="text-xs text-emerald-600">활성 회원</span>
          </div>
        </div>
        <Link
          href="/members"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full border-teal-200 text-teal-600 hover:bg-teal-50"
          )}
        >
          회원 관리
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
