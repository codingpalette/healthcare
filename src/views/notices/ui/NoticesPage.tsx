"use client"

import { useState } from "react"
import type { Profile } from "@/entities/user"
import type { Notice } from "@/entities/notice"
import { NoticeList } from "@/widgets/notice/notice-list"
import { NoticeForm } from "@/widgets/notice/notice-form"

interface NoticesPageProps {
  profile: Profile
}

export function NoticesPage({ profile }: NoticesPageProps) {
  const isTrainer = profile.role !== "member"
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Notice | null>(null)

  const handleAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleEdit = (notice: Notice) => {
    setEditTarget(notice)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }

  return (
    <>
      <NoticeList
        isTrainer={isTrainer}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
      {isTrainer && (
        <NoticeForm
          key={editTarget?.id ?? "new"}
          open={formOpen}
          onOpenChange={handleFormClose}
          editTarget={editTarget}
        />
      )}
    </>
  )
}
