"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createWorkout,
  deleteWorkout,
  getMemberWorkouts,
  getMyWorkouts,
  getTodayWorkouts,
  updateWorkout,
  updateWorkoutFeedback,
} from "@/entities/workout"
import type { WorkoutInput } from "@/entities/workout"

export function useMyWorkouts(from?: string, to?: string) {
  return useQuery({
    queryKey: ["workout", "me", from, to],
    queryFn: () => getMyWorkouts({ from, to }),
  })
}

export function useTodayWorkouts(date?: string) {
  return useQuery({
    queryKey: ["workout", "today", date],
    queryFn: () => getTodayWorkouts(date),
  })
}

export function useMemberWorkouts(id: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["workout", id, from, to],
    queryFn: () => getMemberWorkouts(id, { from, to }),
    enabled: !!id,
  })
}

export function useCreateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, media }: { input: WorkoutInput; media?: File }) =>
      createWorkout(input, media),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout"] })
    },
  })
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      media,
      removeMedia,
    }: {
      id: string
      input: Partial<WorkoutInput>
      media?: File
      removeMedia?: boolean
    }) => updateWorkout(id, input, media, removeMedia),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout"] })
    },
  })
}

export function useUpdateWorkoutFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, trainerFeedback }: { id: string; trainerFeedback: string }) =>
      updateWorkoutFeedback(id, trainerFeedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout"] })
    },
  })
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout"] })
    },
  })
}
