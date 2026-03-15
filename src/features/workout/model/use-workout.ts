"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createWorkout,
  createWorkoutBatch,
  deleteWorkout,
  getMemberWorkouts,
  getMyWorkouts,
  getTodayWorkouts,
  updateWorkout,
  updateWorkoutFeedback,
} from "@/entities/workout"
import type { WorkoutBatchInput, WorkoutInput } from "@/entities/workout"

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
    mutationFn: ({ input, photos }: { input: WorkoutInput; photos?: File[] }) =>
      createWorkout(input, photos),
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
      photos,
      existingMediaUrls,
    }: {
      id: string
      input: Partial<WorkoutInput>
      photos?: File[]
      existingMediaUrls?: string[]
    }) => updateWorkout(id, input, photos, existingMediaUrls),
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

export function useCreateWorkoutBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WorkoutBatchInput) => createWorkoutBatch(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout"] })
    },
  })
}
