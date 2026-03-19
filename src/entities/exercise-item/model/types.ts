export type ExerciseCategory = "upper" | "lower" | "core" | "cardio" | "etc"

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  upper: "상체",
  lower: "하체",
  core: "코어",
  cardio: "유산소",
  etc: "기타",
}

export interface ExerciseItem {
  id: string
  name: string
  category: ExerciseCategory
  description: string | null
  precautions: string | null
  youtubeUrl: string | null
  imageUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface ExerciseItemInput {
  name: string
  category: ExerciseCategory
  description?: string | null
  precautions?: string | null
  youtubeUrl?: string | null
}
