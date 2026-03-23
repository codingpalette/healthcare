"use client"

import type { Profile } from "@/entities/user"
import { ChatBoard } from "@/widgets/chat/chat-board"

interface ChatPageProps {
  profile: Profile
}

export function ChatPage({ profile }: ChatPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">1:1 관리톡</h2>
        <p className="text-muted-foreground">
          {profile.role !== "member"
            ? "담당 회원과 실시간으로 관리 메시지를 주고받으세요."
            : "트레이너와 운동·식단 피드백을 실시간으로 주고받으세요."}
        </p>
      </div>
      <ChatBoard profile={profile} />
    </div>
  )
}
