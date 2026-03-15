"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createEquipment,
  deleteEquipment,
  getEquipmentDetail,
  getEquipmentList,
  updateEquipment,
} from "@/entities/equipment"
import type { EquipmentInput } from "@/entities/equipment"

export function useEquipmentList(category?: string) {
  return useQuery({
    queryKey: ["equipment", "list", category],
    queryFn: () => getEquipmentList(category),
  })
}

export function useEquipmentDetail(id: string) {
  return useQuery({
    queryKey: ["equipment", "detail", id],
    queryFn: () => getEquipmentDetail(id),
    enabled: !!id,
  })
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, photos }: { input: EquipmentInput; photos?: File[] }) =>
      createEquipment(input, photos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] })
    },
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      photos,
      existingImageUrls,
    }: {
      id: string
      input: Partial<EquipmentInput>
      photos?: File[]
      existingImageUrls?: string[]
    }) => updateEquipment(id, input, photos, existingImageUrls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] })
    },
  })
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] })
    },
  })
}
