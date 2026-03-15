"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui"
import { Button, Input, Label } from "@/shared/ui"
import {
  useMemberMembership,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
} from "@/features/membership-management/model/use-memberships"

interface MembershipFormProps {
  memberId: string
  memberName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MembershipForm({ memberId, memberName, open, onOpenChange }: MembershipFormProps) {
  const { data: membership, isLoading } = useMemberMembership(memberId)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [memo, setMemo] = useState("")

  // 기존 회원권 데이터로 폼 초기화
  useEffect(() => {
    if (membership) {
      setStartDate(membership.startDate)
      setEndDate(membership.endDate)
      setMemo(membership.memo ?? "")
    } else {
      setStartDate("")
      setEndDate("")
      setMemo("")
    }
  }, [membership])

  const { mutate: createMembership, isPending: isCreating } = useCreateMembership()
  const { mutate: updateMembership, isPending: isUpdating } = useUpdateMembership()
  const { mutate: deleteMembership, isPending: isDeleting } = useDeleteMembership()

  const isPending = isCreating || isUpdating || isDeleting
  const isEditMode = !!membership

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate) {
      toast.error("시작일을 입력해주세요")
      return
    }
    if (!endDate) {
      toast.error("종료일을 입력해주세요")
      return
    }
    if (endDate < startDate) {
      toast.error("종료일은 시작일 이후여야 합니다")
      return
    }

    if (isEditMode) {
      updateMembership(
        {
          id: membership.id,
          data: {
            startDate,
            endDate,
            memo: memo.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success("회원권이 수정되었습니다")
            onOpenChange(false)
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    } else {
      createMembership(
        {
          memberId,
          startDate,
          endDate,
          memo: memo.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("회원권이 등록되었습니다")
            onOpenChange(false)
          },
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }
  }

  const handleDelete = () => {
    if (!membership) return
    deleteMembership(membership.id, {
      onSuccess: () => {
        toast.success("회원권이 삭제되었습니다")
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {memberName} 회원권 {isEditMode ? "수정" : "등록"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">로딩 중...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="membership-start-date">시작일</Label>
              <Input
                id="membership-start-date"
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="membership-end-date">종료일</Label>
              <Input
                id="membership-end-date"
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="membership-memo">메모 (선택)</Label>
              <textarea
                id="membership-memo"
                value={memo}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <DialogFooter className="gap-2">
              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isCreating || isUpdating
                  ? isEditMode
                    ? "수정 중..."
                    : "등록 중..."
                  : isEditMode
                    ? "수정 완료"
                    : "등록 완료"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
