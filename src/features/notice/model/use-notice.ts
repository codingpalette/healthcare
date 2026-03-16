"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createNotice,
  deleteNotice,
  getNotice,
  getNoticeList,
  updateNotice,
  uploadNoticeImage,
} from "@/entities/notice"
import type { NoticeInput } from "@/entities/notice"

export function useNoticeList(params?: {
  category?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ["notices", "list", params],
    queryFn: () => getNoticeList(params),
  })
}

export function useNotice(id: string) {
  return useQuery({
    queryKey: ["notices", "detail", id],
    queryFn: () => getNotice(id),
    enabled: !!id,
  })
}

export function useCreateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: NoticeInput) => createNotice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] })
    },
  })
}

export function useUpdateNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NoticeInput> }) =>
      updateNotice(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] })
    },
  })
}

export function useDeleteNotice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] })
    },
  })
}

export function useUploadNoticeImage() {
  return useMutation({
    mutationFn: (file: File) => uploadNoticeImage(file),
  })
}
