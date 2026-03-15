"use client"

import Image from "next/image"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui"
import { EQUIPMENT_CATEGORY_LABELS } from "@/entities/equipment"
import type { Equipment, EquipmentCategory } from "@/entities/equipment"
import { extractYoutubeId, getYoutubeEmbedUrl } from "@/shared/lib/youtube"

interface EquipmentDetailProps {
  equipment: Equipment
  onBack: () => void
}

export function EquipmentDetail({ equipment, onBack }: EquipmentDetailProps) {
  const youtubeId = equipment.youtubeUrl ? extractYoutubeId(equipment.youtubeUrl) : null

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        목록으로
      </Button>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{equipment.name}</CardTitle>
            <Badge variant="secondary">
              {EQUIPMENT_CATEGORY_LABELS[equipment.category as EquipmentCategory]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 유튜브 영상 */}
          {youtubeId && (
            <div className="overflow-hidden rounded-xl">
              <div className="relative aspect-video">
                <iframe
                  src={getYoutubeEmbedUrl(youtubeId)}
                  title={`${equipment.name} 사용법 영상`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 size-full"
                />
              </div>
            </div>
          )}

          {/* 이미지 갤러리 */}
          {equipment.imageUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">이미지</h3>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                {equipment.imageUrls.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg">
                    <Image src={url} alt={equipment.name} fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사용법 설명 */}
          {equipment.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">사용법</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {equipment.description}
              </p>
            </div>
          )}

          {/* 주의사항 */}
          {equipment.precautions && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <AlertTriangle className="size-4" />
                주의사항
              </h3>
              <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {equipment.precautions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
