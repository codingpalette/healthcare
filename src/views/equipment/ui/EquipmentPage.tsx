"use client"

import { useState } from "react"
import type { Profile } from "@/entities/user"
import type { Equipment } from "@/entities/equipment"
import { EquipmentList } from "@/widgets/equipment/equipment-list"
import { EquipmentForm } from "@/widgets/equipment/equipment-form"
import { EquipmentDetail } from "@/widgets/equipment/equipment-detail"

interface EquipmentPageProps {
  profile: Profile
}

export function EquipmentPage({ profile }: EquipmentPageProps) {
  const isTrainer = profile.role === "trainer"
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipment | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

  const handleAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleEdit = (equipment: Equipment) => {
    setEditTarget(equipment)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }

  if (selectedEquipment) {
    return (
      <EquipmentDetail
        equipment={selectedEquipment}
        onBack={() => setSelectedEquipment(null)}
      />
    )
  }

  return (
    <>
      <EquipmentList
        isTrainer={isTrainer}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onSelect={setSelectedEquipment}
      />
      {isTrainer && (
        <EquipmentForm
          key={editTarget?.id ?? "new"}
          open={formOpen}
          onOpenChange={handleFormClose}
          editTarget={editTarget}
        />
      )}
    </>
  )
}
