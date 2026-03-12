"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMembers,
  createMember,
  updateMemberProfile,
  softDeleteMember,
  updateRole,
} from "@/entities/user"
import type { CreateMemberRequest, UpdateMemberRequest, UpdateRoleRequest } from "@/entities/user"

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: getMembers,
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMemberRequest) => createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateMemberRequest }) =>
      updateMemberProfile(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => softDeleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateRoleRequest }) =>
      updateRole(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}
