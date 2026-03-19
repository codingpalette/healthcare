"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createExerciseItem,
  deleteExerciseItem,
  getExerciseItemDetail,
  getExerciseItemList,
  searchExerciseItems,
  updateExerciseItem,
} from "@/entities/exercise-item"
import type { ExerciseItemInput } from "@/entities/exercise-item"

export function useExerciseItemList(category?: string) {
  return useQuery({
    queryKey: ["exercise-items", "list", category],
    queryFn: () => getExerciseItemList(category),
  })
}

export function useExerciseItemDetail(id: string) {
  return useQuery({
    queryKey: ["exercise-items", "detail", id],
    queryFn: () => getExerciseItemDetail(id),
    enabled: !!id,
  })
}

export function useExerciseItemSearch(search: string) {
  return useQuery({
    queryKey: ["exercise-items", "search", search],
    queryFn: () => searchExerciseItems(search),
    enabled: search.length >= 2,
  })
}

export function useCreateExerciseItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, photos }: { input: ExerciseItemInput; photos?: File[] }) =>
      createExerciseItem(input, photos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-items"] })
    },
  })
}

export function useUpdateExerciseItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      photos,
      existingImageUrls,
    }: {
      id: string
      input: Partial<ExerciseItemInput>
      photos?: File[]
      existingImageUrls?: string[]
    }) => updateExerciseItem(id, input, photos, existingImageUrls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-items"] })
    },
  })
}

export function useDeleteExerciseItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteExerciseItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-items"] })
    },
  })
}
