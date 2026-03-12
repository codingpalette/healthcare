"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMembers,
  getMyMembers,
  assignTrainer,
  unassignTrainer,
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

export function useMyMembers() {
  return useQuery({
    queryKey: ["members", "mine"],
    queryFn: getMyMembers,
  })
}

export function useAssignTrainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, trainerId }: { memberId: string; trainerId: string }) =>
      assignTrainer(memberId, trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useUnassignTrainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => unassignTrainer(memberId),
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
