"use client"

import { useState } from "react"
import type { Profile } from "@/entities/user"
import { useNotice } from "@/features/notice"
import { NoticeDetail } from "@/widgets/notice/notice-detail"
import { NoticeForm } from "@/widgets/notice/notice-form"

interface NoticeDetailPageProps {
  profile: Profile
  noticeId: string
}

export function NoticeDetailPage({ profile, noticeId }: NoticeDetailPageProps) {
  const isTrainer = profile.role !== "member"
  const { data: notice, isLoading } = useNotice(noticeId)
  const [formOpen, setFormOpen] = useState(false)

  if (isLoading) return <div className="p-6">로딩 중...</div>
  if (!notice) return <div className="p-6">공지사항을 찾을 수 없습니다</div>

  return (
    <>
      <NoticeDetail
        notice={notice}
        isTrainer={isTrainer}
        onEdit={() => setFormOpen(true)}
      />
      {isTrainer && (
        <NoticeForm
          key={notice.id}
          open={formOpen}
          onOpenChange={setFormOpen}
          editTarget={notice}
        />
      )}
    </>
  )
}
