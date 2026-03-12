"use client"

import Link from "next/link"
import { Users, UserCheck, UserPlus, ArrowRight } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  buttonVariants,
  Skeleton,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"
import { useMembers, useMyMembers } from "@/features/member-management"

// 회원 현황 카드 위젯
export function MemberOverviewCard() {
  const { data: members, isLoading } = useMembers()
  const { data: myMembers, isLoading: isMyMembersLoading } = useMyMembers()

  const membersOnly = members?.filter((m) => m.role === "member") ?? []
  const totalCount = membersOnly.length
  const activeCount = membersOnly.filter((m) => !m.deletedAt).length
  const myMemberCount = myMembers?.length ?? 0

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
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-xl bg-teal-50 p-4">
            <Users className="size-6 text-teal-500" />
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-8" />
            ) : (
              <span className="mt-2 text-2xl font-bold text-teal-700">{totalCount}</span>
            )}
            <span className="text-xs text-teal-600">전체 회원</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-4">
            <UserCheck className="size-6 text-emerald-500" />
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-8" />
            ) : (
              <span className="mt-2 text-2xl font-bold text-emerald-700">{activeCount}</span>
            )}
            <span className="text-xs text-emerald-600">활성 회원</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-blue-50 p-4">
            <UserPlus className="size-6 text-blue-500" />
            {isMyMembersLoading ? (
              <Skeleton className="mt-2 h-8 w-8" />
            ) : (
              <span className="mt-2 text-2xl font-bold text-blue-700">{myMemberCount}</span>
            )}
            <span className="text-xs text-blue-600">내 회원</span>
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
