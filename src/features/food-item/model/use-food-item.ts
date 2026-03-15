"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createFoodItem,
  deleteFoodItem,
  getFoodItems,
  updateFoodItem,
} from "@/entities/food-item"
import type { FoodItemInput } from "@/entities/food-item"

export function useFoodItems(search?: string) {
  return useQuery({
    queryKey: ["food-items", search],
    queryFn: () => getFoodItems(search),
  })
}

export function useCreateFoodItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FoodItemInput) => createFoodItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-items"] })
    },
  })
}

export function useUpdateFoodItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FoodItemInput> }) =>
      updateFoodItem(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-items"] })
    },
  })
}

export function useDeleteFoodItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteFoodItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-items"] })
    },
  })
}
