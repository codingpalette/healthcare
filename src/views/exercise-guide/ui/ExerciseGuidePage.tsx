"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { Profile } from "@/entities/user"
import type { ExerciseItem } from "@/entities/exercise-item"
import { useExerciseItemList } from "@/features/exercise-item"
import { ExerciseItemList } from "@/widgets/exercise-item/exercise-item-list"
import { ExerciseItemForm } from "@/widgets/exercise-item/exercise-item-form"
import { ExerciseItemDetail } from "@/widgets/exercise-item/exercise-item-detail"

interface ExerciseGuidePageProps {
  profile: Profile
}

export function ExerciseGuidePage({ profile }: ExerciseGuidePageProps) {
  const isTrainer = profile.role === "trainer"
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExerciseItem | null>(null)
  const [selectedExerciseItem, setSelectedExerciseItem] = useState<ExerciseItem | null>(null)
  const searchParams = useSearchParams()
  const { data: exerciseItemList } = useExerciseItemList()

  // ?id= 쿼리 파라미터로 운동 항목 자동 열기
  useEffect(() => {
    const id = searchParams.get("id")
    if (id && exerciseItemList && !selectedExerciseItem) {
      const found = exerciseItemList.find((e) => e.id === id)
      if (found) setSelectedExerciseItem(found)
    }
  }, [searchParams, exerciseItemList, selectedExerciseItem])

  const handleAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleEdit = (exerciseItem: ExerciseItem) => {
    setEditTarget(exerciseItem)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }

  if (selectedExerciseItem) {
    return (
      <ExerciseItemDetail
        exerciseItem={selectedExerciseItem}
        onBack={() => setSelectedExerciseItem(null)}
      />
    )
  }

  return (
    <>
      <ExerciseItemList
        isTrainer={isTrainer}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onSelect={setSelectedExerciseItem}
      />
      {isTrainer && (
        <ExerciseItemForm
          key={editTarget?.id ?? "new"}
          open={formOpen}
          onOpenChange={handleFormClose}
          editTarget={editTarget}
        />
      )}
    </>
  )
}
