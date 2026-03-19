export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export interface Meal {
  id: string
  userId: string
  mealType: MealType
  description: string | null
  calories: number | null
  carbs: number | null
  protein: number | null
  fat: number | null
  fiber: number | null
  photoUrls: string[]
  trainerFeedback: string | null
  date: string
  createdAt: string
  updatedAt: string
}

export interface MealWithProfile extends Meal {
  userName: string
}

export interface MealInput {
  mealType: MealType
  description?: string
  calories?: number
  carbs?: number
  protein?: number
  fat?: number
  fiber?: number
  date?: string
}
