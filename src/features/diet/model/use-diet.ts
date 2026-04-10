"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createMeal,
  getMyMeals,
  getTodayMeals,
  getMemberMeals,
  updateMeal,
  updateMealFeedback,
  markMealReviewed,
  deleteMeal,
} from "@/entities/meal"
import type { MealInput } from "@/entities/meal"

export function useMyMeals(from?: string, to?: string) {
  return useQuery({
    queryKey: ["diet", "me", from, to],
    queryFn: () => getMyMeals({ from, to }),
  })
}

export function useTodayMeals(date?: string) {
  return useQuery({
    queryKey: ["diet", "today", date],
    queryFn: () => getTodayMeals(date),
  })
}

export function useMemberMeals(id: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["diet", id, from, to],
    queryFn: () => getMemberMeals(id, { from, to }),
    enabled: !!id,
  })
}

export function useCreateMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, photos }: { input: MealInput; photos?: File[] }) =>
      createMeal(input, photos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet"] })
    },
  })
}

export function useUpdateMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      photos,
      existingPhotoUrls,
    }: {
      id: string
      input: Partial<MealInput>
      photos?: File[]
      existingPhotoUrls?: string[]
    }) => updateMeal(id, input, photos, existingPhotoUrls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet"] })
    },
  })
}

export function useDeleteMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet"] })
    },
  })
}

export function useUpdateMealFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, trainerFeedback }: { id: string; trainerFeedback: string }) =>
      updateMealFeedback(id, trainerFeedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet"] })
    },
  })
}

export function useMarkMealReviewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => markMealReviewed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet"] })
    },
  })
}
