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
import { EXERCISE_CATEGORY_LABELS } from "@/entities/exercise-item"
import type { ExerciseItem, ExerciseCategory } from "@/entities/exercise-item"
import { extractYoutubeId, getYoutubeEmbedUrl } from "@/shared/lib/youtube"

interface ExerciseItemDetailProps {
  exerciseItem: ExerciseItem
  onBack: () => void
}

export function ExerciseItemDetail({ exerciseItem, onBack }: ExerciseItemDetailProps) {
  const youtubeId = exerciseItem.youtubeUrl ? extractYoutubeId(exerciseItem.youtubeUrl) : null

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        목록으로
      </Button>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{exerciseItem.name}</CardTitle>
            <Badge variant="secondary">
              {EXERCISE_CATEGORY_LABELS[exerciseItem.category as ExerciseCategory]}
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
                  title={`${exerciseItem.name} 운동 영상`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 size-full"
                />
              </div>
            </div>
          )}

          {/* 이미지 갤러리 */}
          {exerciseItem.imageUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">이미지</h3>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                {exerciseItem.imageUrls.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg">
                    <Image src={url} alt={exerciseItem.name} fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 운동 설명 */}
          {exerciseItem.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">운동 방법</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {exerciseItem.description}
              </p>
            </div>
          )}

          {/* 주의사항 */}
          {exerciseItem.precautions && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <AlertTriangle className="size-4" />
                주의사항
              </h3>
              <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {exerciseItem.precautions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
