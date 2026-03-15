export interface FoodItem {
  id: string
  name: string
  servingSize: number
  unit: string
  calories: number | null
  carbs: number | null
  protein: number | null
  fat: number | null
  createdAt: string
  updatedAt: string
}

export type FoodItemInput = {
  name: string
  servingSize?: number
  unit?: string
  calories?: number | null
  carbs?: number | null
  protein?: number | null
  fat?: number | null
}
