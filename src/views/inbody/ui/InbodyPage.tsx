"use client"

import type { Profile } from "@/entities/user"
import { InbodyMemberTable } from "@/widgets/inbody/inbody-member-table"
import { InbodyRecordList } from "@/widgets/inbody/inbody-record-list"

export function InbodyPage({ profile }: { profile: Profile }) {
  if (profile.role !== "member") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">인바디 관리</h2>
          <p className="text-muted-foreground">회원 인바디 기록과 측정일을 함께 관리하세요.</p>
        </div>
        <InbodyMemberTable />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">내 인바디 기록</h2>
        <p className="text-muted-foreground">월별 변화를 보고 최근 측정 기록을 정리하세요.</p>
      </div>
      <InbodyRecordList />
    </div>
  )
}
