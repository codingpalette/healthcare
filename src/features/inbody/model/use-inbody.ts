"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createInbodyRecord,
  deleteInbodyRecord,
  getMemberInbodyRecords,
  getMemberInbodyReminder,
  getMyInbodyRecords,
  getMyInbodyReminder,
  getTrainerInbodyOverview,
  updateInbodyRecord,
  updateMemberInbodyReminder,
} from "@/entities/inbody"
import type { InbodyInput, InbodyReminderInput } from "@/entities/inbody"

export function useMyInbodyRecords(from?: string, to?: string) {
  return useQuery({
    queryKey: ["inbody", "me", from, to],
    queryFn: () => getMyInbodyRecords({ from, to }),
  })
}

export function useMemberInbodyRecords(memberId: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["inbody", "member", memberId, from, to],
    queryFn: () => getMemberInbodyRecords(memberId, { from, to }),
    enabled: !!memberId,
  })
}

export function useTrainerInbodyOverview() {
  return useQuery({
    queryKey: ["inbody", "trainer-overview"],
    queryFn: getTrainerInbodyOverview,
  })
}

export function useMyInbodyReminder() {
  return useQuery({
    queryKey: ["inbody", "reminder", "me"],
    queryFn: getMyInbodyReminder,
  })
}

export function useMemberInbodyReminder(memberId: string) {
  return useQuery({
    queryKey: ["inbody", "reminder", memberId],
    queryFn: () => getMemberInbodyReminder(memberId),
    enabled: !!memberId,
  })
}

export function useCreateInbodyRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, photos }: { input: InbodyInput; photos?: File[] }) =>
      createInbodyRecord(input, photos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbody"] })
    },
  })
}

export function useUpdateInbodyRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      photos,
      existingPhotoUrls,
    }: {
      id: string
      input: Partial<InbodyInput>
      photos?: File[]
      existingPhotoUrls?: string[]
    }) => updateInbodyRecord(id, input, photos, existingPhotoUrls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbody"] })
    },
  })
}

export function useDeleteInbodyRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteInbodyRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbody"] })
    },
  })
}

export function useUpdateMemberInbodyReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: InbodyReminderInput }) =>
      updateMemberInbodyReminder(memberId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inbody", "reminder", variables.memberId] })
      queryClient.invalidateQueries({ queryKey: ["inbody", "reminder", "me"] })
      queryClient.invalidateQueries({ queryKey: ["inbody", "trainer-overview"] })
    },
  })
}
