"use client"

import { useState } from "react"
import type { Profile } from "@/entities/user"
import { AddMemberForm, EditMemberForm } from "@/features/member-management"
import { MemberDeviceList } from "@/features/device-management"
import { useMemberDevices, useRemoveMemberDevice } from "@/features/device-management"
import { MembershipForm } from "@/features/membership-management"
import { MemberListTable } from "@/widgets/member"
import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui"

interface MembersPageProps {
  currentUserId: string
}

/** 회원 기기 목록 래퍼 컴포넌트 */
function MemberDeviceListWrapper({ userId }: { userId: string }) {
  const { data: devices, isLoading } = useMemberDevices(userId)
  const removeDevice = useRemoveMemberDevice()

  return (
    <MemberDeviceList
      userId={userId}
      devices={devices ?? []}
      isLoading={isLoading}
      onRemove={(deviceId) => removeDevice.mutate({ userId, deviceId })}
      isRemoving={removeDevice.isPending}
    />
  )
}

export function MembersPage({ currentUserId }: MembersPageProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editMember, setEditMember] = useState<Profile | null>(null)
  const [deviceMember, setDeviceMember] = useState<Profile | null>(null)
  const [membershipTarget, setMembershipTarget] = useState<Profile | null>(null)
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">유저 관리</h1>
        <p className="text-sm text-muted-foreground">
          유저를 추가하고 관리할 수 있습니다
        </p>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-4 sm:p-6">
          <MemberListTable
            currentUserId={currentUserId}
            onAdd={() => setAddOpen(true)}
            onEdit={(member) => setEditMember(member)}
            onViewDevices={(member) => setDeviceMember(member)}
            onMembershipEdit={(member) => {
              setMembershipTarget(member)
              setMembershipDialogOpen(true)
            }}
          />
        </CardContent>
      </Card>

      {/* 유저 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>유저 추가</DialogTitle>
            <DialogDescription>
              새로운 유저의 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>
          <AddMemberForm onSuccess={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* 유저 편집 다이얼로그 */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>유저 정보 수정</DialogTitle>
            <DialogDescription>
              유저 정보를 수정할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <EditMemberForm
              member={editMember}
              currentUserId={currentUserId}
              onSuccess={() => setEditMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 회원권 설정 다이얼로그 */}
      {membershipTarget && (
        <MembershipForm
          memberId={membershipTarget.id}
          memberName={membershipTarget.name}
          open={membershipDialogOpen}
          onOpenChange={(open) => {
            setMembershipDialogOpen(open)
            if (!open) setMembershipTarget(null)
          }}
        />
      )}

      {/* 회원 기기 조회 다이얼로그 */}
      <Dialog open={!!deviceMember} onOpenChange={(open) => !open && setDeviceMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deviceMember?.name}님의 접속 기기</DialogTitle>
          </DialogHeader>
          {deviceMember && (
            <MemberDeviceListWrapper userId={deviceMember.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
