"use client"

import { CommunityBoard } from "@/widgets/community"

interface CommunityPageProps {
  userId: string
}

export function CommunityPage({ userId }: CommunityPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">커뮤니티</h2>
        <p className="text-muted-foreground">
          익명 닉네임으로 다른 회원들과 자유롭게 대화하세요.
        </p>
      </div>
      <CommunityBoard userId={userId} />
    </div>
  )
}
