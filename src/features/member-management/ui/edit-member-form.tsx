"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Button,
  Input,
  Label,
  Separator,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui"
import type { Profile, UserRole } from "@/entities/user"
import {
  useUpdateMember,
  useUpdateRole,
  useAssignTrainer,
  useUnassignTrainer,
  useDeleteMember,
} from "@/features/member-management/model/use-members"
import { useMemberDevices, useRemoveMemberDevice, MemberDeviceList } from "@/features/device-management"
import { MembershipSection } from "@/features/membership-management"

interface EditMemberFormProps {
  member: Profile
  currentUserId: string
  onSuccess?: () => void
}

export function EditMemberForm({ member, currentUserId, onSuccess }: EditMemberFormProps) {
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone ?? "")
  const [role, setRole] = useState<UserRole>(member.role)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { mutate, isPending } = useUpdateMember()
  const { mutate: changeRole, isPending: isRolePending } = useUpdateRole()
  const { mutate: assignTrainer, isPending: isAssigning } = useAssignTrainer()
  const { mutate: unassignTrainer, isPending: isUnassigning } = useUnassignTrainer()
  const { mutate: deleteMember, isPending: isDeletePending } = useDeleteMember()
  const { data: devices, isLoading: devicesLoading } = useMemberDevices(member.id)
  const removeDevice = useRemoveMemberDevice()

  const canChangeRole = member.id !== currentUserId
  const isMyMember = member.trainerId === currentUserId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    if (canChangeRole && role !== member.role) {
      changeRole(
        { memberId: member.id, data: { role } },
        {
          onError: (error) => toast.error(error.message),
        }
      )
    }

    mutate(
      {
        memberId: member.id,
        data: { name: name.trim(), phone: phone.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("유저 정보가 수정되었습니다")
          onSuccess?.()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  const handleAssign = () => {
    assignTrainer(
      { memberId: member.id, trainerId: currentUserId },
      {
        onSuccess: () => toast.success(`${member.name}님을 내 회원으로 등록했습니다`),
        onError: (error) => toast.error(error.message),
      }
    )
  }

  const handleUnassign = () => {
    unassignTrainer(member.id, {
      onSuccess: () => toast.success(`${member.name}님을 내 회원에서 해제했습니다`),
      onError: (error) => toast.error(error.message),
    })
  }

  const handleDelete = () => {
    deleteMember(member.id, {
      onSuccess: () => {
        toast.success(`${member.name}님이 삭제되었습니다`)
        setDeleteConfirmOpen(false)
        onSuccess?.()
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {/* 기본 정보 수정 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">이름</Label>
          <Input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
          />
        </div>
        {canChangeRole && (
          <div className="space-y-2">
            <Label htmlFor="edit-role">권한</Label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="member">회원</option>
              <option value="trainer">트레이너</option>
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-phone">전화번호 (선택)</Label>
          <Input
            id="edit-phone"
            type="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending || isRolePending}>
          {isPending || isRolePending ? "수정 중..." : "수정 완료"}
        </Button>
      </form>

      {/* 회원권 관리 (회원만) */}
      {member.role === "member" && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 text-sm font-semibold">회원권 관리</h3>
            <MembershipSection memberId={member.id} />
          </div>
        </>
      )}

      {/* 트레이너 배정 (회원만, 자기 자신 제외) */}
      {member.role === "member" && member.id !== currentUserId && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 text-sm font-semibold">트레이너 배정</h3>
            {isMyMember ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleUnassign}
                disabled={isUnassigning}
              >
                {isUnassigning ? "해제 중..." : "내 회원에서 해제"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAssign}
                disabled={isAssigning}
              >
                {isAssigning ? "등록 중..." : "내 회원으로 등록"}
              </Button>
            )}
          </div>
        </>
      )}

      {/* 접속 기기 */}
      <Separator />
      <div>
        <h3 className="mb-3 text-sm font-semibold">접속 기기</h3>
        <MemberDeviceList
          userId={member.id}
          devices={devices ?? []}
          isLoading={devicesLoading}
          onRemove={(deviceId) => removeDevice.mutate({ userId: member.id, deviceId })}
          isRemoving={removeDevice.isPending}
        />
      </div>

      {/* 삭제 (자기 자신 제외) */}
      {member.id !== currentUserId && (
        <>
          <Separator />
          <div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              유저 삭제
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유저를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {member.name}님을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletePending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
