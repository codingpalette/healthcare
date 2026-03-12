"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/entities/user"
import { useMembers, useMyMembers, useAssignTrainer, useUnassignTrainer, useDeleteMember, useUpdateRole } from "@/features/member-management"
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui"

interface MemberListTableProps {
  currentUserId: string
  onAdd: () => void
  onEdit: (member: Profile) => void
}

export function MemberListTable({ currentUserId, onAdd, onEdit }: MemberListTableProps) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "member" | "trainer" | "mine">("all")
  const { data: members, isLoading } = useMembers()
  const { data: myMembers } = useMyMembers()
  const { mutate: deleteMember } = useDeleteMember()
  const { mutate: changeRole } = useUpdateRole()
  const { mutate: assign } = useAssignTrainer()
  const { mutate: unassign } = useUnassignTrainer()

  const myMemberIds = new Set((myMembers ?? []).map((m) => m.id))

  const filtered = (roleFilter === "mine" ? (myMembers ?? []) : (members ?? [])).filter((m) => {
    if (roleFilter !== "all" && roleFilter !== "mine" && m.role !== roleFilter) return false
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email?.toLowerCase().includes(q) ?? false) ||
      (m.phone?.toLowerCase().includes(q) ?? false)
    )
  })

  const handleRoleChange = (member: Profile) => {
    const newRole = member.role === "member" ? "trainer" : "member"
    const label = newRole === "trainer" ? "트레이너" : "회원"
    if (!confirm(`${member.name}님의 권한을 ${label}(으)로 변경하시겠습니까?`)) return
    changeRole(
      { memberId: member.id, data: { role: newRole } },
      {
        onSuccess: () => toast.success(`${member.name}님의 권한이 ${label}(으)로 변경되었습니다`),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const handleAssign = (member: Profile) => {
    if (!confirm(`${member.name}님을 내 회원으로 등록하시겠습니까?`)) return
    assign(
      { memberId: member.id, trainerId: currentUserId },
      {
        onSuccess: () => toast.success(`${member.name}님이 내 회원으로 등록되었습니다`),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const handleUnassign = (member: Profile) => {
    if (!confirm(`${member.name}님을 내 회원에서 해제하시겠습니까?`)) return
    unassign(member.id, {
      onSuccess: () => toast.success(`${member.name}님이 내 회원에서 해제되었습니다`),
      onError: (err) => toast.error(err.message),
    })
  }

  const handleDelete = (member: Profile) => {
    if (!confirm(`${member.name} 유저를 삭제하시겠습니까?`)) return
    deleteMember(member.id, {
      onSuccess: () => toast.success("유저가 삭제되었습니다"),
      onError: (err) => toast.error(err.message),
    })
  }

  const formatEmail = (email: string | null) => {
    if (!email) return "-"
    return email.endsWith("@health.app") ? email.replace("@health.app", "") : email
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ko-KR")

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름, 아이디 또는 전화번호로 검색"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <div className="flex gap-1 overflow-x-auto">
            {([["all", "전체"], ["member", "회원"], ["trainer", "트레이너"], ["mine", "내 회원"]] as const).map(([value, label]) => (
              <Button
                key={value}
                variant={roleFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button onClick={onAdd} size="sm" className="shrink-0">
            <Plus className="mr-1 size-4" />
            유저 추가
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">
            {members?.length === 0
              ? "등록된 유저가 없습니다"
              : "검색 결과가 없습니다"}
          </p>
        </div>
      ) : (
        <>
        {/* 모바일 카드 뷰 */}
        <div className="space-y-2 md:hidden">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="cursor-pointer rounded-lg border p-3 active:bg-muted/50"
              onClick={() => onEdit(member)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.name}</span>
                  <Badge variant={member.role === "trainer" ? "default" : "secondary"}>
                    {member.role === "trainer" ? "트레이너" : "회원"}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(member)
                      }}
                    >
                      수정
                    </DropdownMenuItem>
                    {member.id !== currentUserId && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRoleChange(member)
                        }}
                      >
                        {member.role === "member" ? "트레이너로 변경" : "회원으로 변경"}
                      </DropdownMenuItem>
                    )}
                    {member.role === "member" && member.id !== currentUserId && (
                      myMemberIds.has(member.id) ? (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassign(member)
                          }}
                        >
                          내 회원에서 해제
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAssign(member)
                          }}
                        >
                          내 회원으로 등록
                        </DropdownMenuItem>
                      )
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(member)
                      }}
                    >
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {member.phone ?? "-"}
              </p>
            </div>
          ))}
        </div>

        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>아이디</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>전화번호</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
                  onClick={() => onEdit(member)}
                >
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{formatEmail(member.email)}</TableCell>
                  <TableCell>{member.role === "trainer" ? "트레이너" : "회원"}</TableCell>
                  <TableCell>{member.phone ?? "-"}</TableCell>
                  <TableCell>{formatDate(member.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(member)
                          }}
                        >
                          수정
                        </DropdownMenuItem>
                        {member.id !== currentUserId && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRoleChange(member)
                            }}
                          >
                            {member.role === "member" ? "트레이너로 변경" : "회원으로 변경"}
                          </DropdownMenuItem>
                        )}
                        {member.role === "member" && member.id !== currentUserId && (
                          myMemberIds.has(member.id) ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnassign(member)
                              }}
                            >
                              내 회원에서 해제
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAssign(member)
                              }}
                            >
                              내 회원으로 등록
                            </DropdownMenuItem>
                          )
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(member)
                          }}
                        >
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </div>
  )
}
