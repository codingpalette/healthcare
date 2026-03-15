"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMyMembership,
  getMemberships,
  getMemberMembership,
  createMembership,
  updateMembership,
  deleteMembership,
} from "@/entities/membership"
import type { CreateMembershipRequest, UpdateMembershipRequest } from "@/entities/membership"

export function useMyMembership() {
  return useQuery({
    queryKey: ["membership", "me"],
    queryFn: getMyMembership,
  })
}

export function useMemberships() {
  return useQuery({
    queryKey: ["memberships"],
    queryFn: getMemberships,
  })
}

export function useMemberMembership(memberId: string) {
  return useQuery({
    queryKey: ["membership", memberId],
    queryFn: () => getMemberMembership(memberId),
    enabled: !!memberId,
  })
}

export function useCreateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMembershipRequest) => createMembership(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
      queryClient.invalidateQueries({ queryKey: ["membership"] })
    },
  })
}

export function useUpdateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMembershipRequest }) =>
      updateMembership(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
      queryClient.invalidateQueries({ queryKey: ["membership"] })
    },
  })
}

export function useDeleteMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
      queryClient.invalidateQueries({ queryKey: ["membership"] })
    },
  })
}
