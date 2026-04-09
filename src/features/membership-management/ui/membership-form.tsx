"use client"

import { useState, useEffect } from "react"
import { ko } from "date-fns/locale"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
} from "@/shared/ui"
import { Button, Label } from "@/shared/ui"
import { cn } from "@/shared/lib/utils"
import {
  useMemberMembership,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
} from "@/features/membership-management/model/use-memberships"

interface MembershipSectionProps {
  memberId: string
}

/**
 * 회원권 관리 섹션 — EditMemberForm 내부에 임베드하여 사용
 */
export function MembershipSection({ memberId }: MembershipSectionProps) {
  const { data: membership, isLoading } = useMemberMembership(memberId)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [memo, setMemo] = useState("")

  /* eslint-disable react-hooks/set-state-in-effect -- 서버 데이터로 폼 초기화 */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const { mutate: createMembership, isPending: isCreating } = useCreateMembership()
  const { mutate: updateMembership, isPending: isUpdating } = useUpdateMembership()
  const { mutate: deleteMembership, isPending: isDeleting } = useDeleteMembership()

  const isPending = isCreating || isUpdating || isDeleting
  const isEditMode = !!membership

  const handleMembershipSubmit = () => {
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
          data: { startDate, endDate, memo: memo.trim() || undefined },
        },
        {
          onSuccess: () => toast.success("회원권이 수정되었습니다"),
          onError: (error) => toast.error(error.message),
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
          onSuccess: () => toast.success("회원권이 등록되었습니다"),
          onError: (error) => toast.error(error.message),
        }
      )
    }
  }

  const handleDelete = () => {
    if (!membership) return
    deleteMembership(membership.id, {
      onSuccess: () => toast.success("회원권이 삭제되었습니다"),
      onError: (error) => toast.error(error.message),
    })
  }

  if (isLoading) {
    return (
      <div className="py-2 text-center text-sm text-muted-foreground">회원권 정보 로딩 중...</div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>시작일</Label>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-between font-normal",
                  !startDate && "text-muted-foreground"
                )}
              />
            }
          >
            <span>{startDate ? format(new Date(startDate), "yyyy년 MM월 dd일") : "시작일을 선택하세요"}</span>
            <CalendarIcon className="size-4" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <Calendar
              mode="single"
              locale={ko}
              selected={startDate ? new Date(startDate) : undefined}
              onSelect={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>종료일</Label>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-between font-normal",
                  !endDate && "text-muted-foreground"
                )}
              />
            }
          >
            <span>{endDate ? format(new Date(endDate), "yyyy년 MM월 dd일") : "종료일을 선택하세요"}</span>
            <CalendarIcon className="size-4" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <Calendar
              mode="single"
              locale={ko}
              selected={endDate ? new Date(endDate) : undefined}
              onSelect={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
              disabled={(date) => startDate ? date < new Date(startDate) : false}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="membership-memo">메모 (선택)</Label>
        <textarea
          id="membership-memo"
          value={memo}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemo(e.target.value)}
          placeholder="메모를 입력하세요"
          rows={2}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex gap-2">
        {isEditMode && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isDeleting ? "삭제 중..." : "회원권 삭제"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleMembershipSubmit}
          disabled={isPending}
          className="ml-auto"
        >
          {isCreating || isUpdating
            ? "저장 중..."
            : isEditMode
              ? "회원권 수정"
              : "회원권 등록"}
        </Button>
      </div>
    </div>
  )
}
