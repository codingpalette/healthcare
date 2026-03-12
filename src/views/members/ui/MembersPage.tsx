"use client"

import { useState } from "react"
import type { Profile } from "@/entities/user"
import { AddMemberForm, EditMemberForm } from "@/features/member-management"
import { MemberListTable } from "@/widgets/member"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui"

export function MembersPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editMember, setEditMember] = useState<Profile | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <p className="text-sm text-muted-foreground">
          회원을 추가하고 관리할 수 있습니다
        </p>
      </div>

      <MemberListTable
        onAdd={() => setAddOpen(true)}
        onEdit={(member) => setEditMember(member)}
      />

      {/* 회원 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 추가</DialogTitle>
            <DialogDescription>
              새로운 회원의 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>
          <AddMemberForm onSuccess={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 회원 편집 다이얼로그 */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 정보 수정</DialogTitle>
            <DialogDescription>
              회원 정보를 수정할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <EditMemberForm
              member={editMember}
              onSuccess={() => setEditMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
