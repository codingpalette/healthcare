export type EquipmentCategory = "upper" | "lower" | "core" | "cardio" | "etc"

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  upper: "상체",
  lower: "하체",
  core: "코어",
  cardio: "유산소",
  etc: "기타",
}

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  description: string | null
  precautions: string | null
  youtubeUrl: string | null
  imageUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface EquipmentInput {
  name: string
  category: EquipmentCategory
  description?: string | null
  precautions?: string | null
  youtubeUrl?: string | null
}
