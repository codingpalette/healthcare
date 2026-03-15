"use client"

import { useState } from "react"
import type { FoodItem } from "@/entities/food-item"
import { FoodItemManager } from "@/widgets/food-item/food-item-manager"
import { FoodItemForm } from "@/widgets/food-item/food-item-form"

export function FoodItemPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FoodItem | null>(null)

  const handleAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleEdit = (item: FoodItem) => {
    setEditTarget(item)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }

  return (
    <>
      <FoodItemManager onAdd={handleAdd} onEdit={handleEdit} />
      <FoodItemForm
        key={editTarget?.id ?? "new"}
        open={formOpen}
        onOpenChange={handleFormClose}
        editTarget={editTarget}
      />
    </>
  )
}
