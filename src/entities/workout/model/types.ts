export interface Workout {
  id: string
  userId: string
  exerciseName: string
  sets: number | null
  reps: number | null
  weight: number | null
  durationMinutes: number | null
  caloriesBurned: number | null
  notes: string | null
  mediaUrls: string[]
  trainerFeedback: string | null
  date: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutWithProfile extends Workout {
  userName: string
}

export interface WorkoutInput {
  exerciseName: string
  sets?: number | null
  reps?: number | null
  weight?: number | null
  durationMinutes?: number | null
  caloriesBurned?: number | null
  notes?: string | null
  date?: string
}
