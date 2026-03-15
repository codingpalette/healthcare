"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { ImagePlus, X } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from "@/shared/ui"
import { useCreateEquipment, useUpdateEquipment } from "@/features/equipment"
import { EQUIPMENT_CATEGORY_LABELS } from "@/entities/equipment"
import type { Equipment, EquipmentCategory, EquipmentInput } from "@/entities/equipment"
import { compressImageToWebP } from "@/shared/lib/media"

interface EquipmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: Equipment | null
}

const categories = Object.entries(EQUIPMENT_CATEGORY_LABELS) as [EquipmentCategory, string][]

export function EquipmentForm({ open, onOpenChange, editTarget }: EquipmentFormProps) {
  const isEdit = !!editTarget
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(editTarget?.name ?? "")
  const [category, setCategory] = useState<EquipmentCategory>(editTarget?.category ?? "upper")
  const [description, setDescription] = useState(editTarget?.description ?? "")
  const [precautions, setPrecautions] = useState(editTarget?.precautions ?? "")
  const [youtubeUrl, setYoutubeUrl] = useState(editTarget?.youtubeUrl ?? "")
  const [existingImages, setExistingImages] = useState<string[]>(editTarget?.imageUrls ?? [])
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const isPending = createEquipment.isPending || updateEquipment.isPending
  const totalImages = existingImages.length + newPhotos.length

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (totalImages + files.length > 5) {
      toast.error("이미지는 최대 5장까지 업로드할 수 있습니다")
      return
    }

    const compressed: File[] = []
    const urls: string[] = []
    for (const file of files) {
      const webp = await compressImageToWebP(file)
      compressed.push(webp)
      urls.push(URL.createObjectURL(webp))
    }
    setNewPhotos((prev) => [...prev, ...compressed])
    setPreviewUrls((prev) => [...prev, ...urls])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setNewPhotos((prev) => prev.filter((_, i) => i !== index))
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("기구명을 입력해주세요")
      return
    }

    const input: EquipmentInput = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      precautions: precautions.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
    }

    try {
      if (isEdit && editTarget) {
        await updateEquipment.mutateAsync({
          id: editTarget.id,
          input,
          photos: newPhotos.length > 0 ? newPhotos : undefined,
          existingImageUrls: existingImages,
        })
        toast.success("기구 정보가 수정되었습니다")
      } else {
        await createEquipment.mutateAsync({
          input,
          photos: newPhotos.length > 0 ? newPhotos : undefined,
        })
        toast.success("기구가 등록되었습니다")
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? "기구 수정에 실패했습니다" : "기구 등록에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "기구 수정" : "기구 추가"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "기구 정보를 수정합니다." : "새로운 기구를 등록합니다."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 기구명 */}
          <div className="space-y-2">
            <Label htmlFor="name">기구명 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 레그프레스"
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label>카테고리 *</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={category === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">사용법 설명</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="기구 사용 방법을 설명해주세요"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* 주의사항 */}
          <div className="space-y-2">
            <Label htmlFor="precautions">주의사항</Label>
            <textarea
              id="precautions"
              value={precautions}
              onChange={(e) => setPrecautions(e.target.value)}
              placeholder="사용 시 주의해야 할 점을 작성해주세요"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* 유튜브 URL */}
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">유튜브 영상 URL</Label>
            <Input
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          {/* 이미지 */}
          <div className="space-y-2">
            <Label>이미지 (최대 5장)</Label>
            <div className="flex flex-wrap gap-2">
              {existingImages.map((url, i) => (
                <div key={url} className="relative size-20 overflow-hidden rounded-md">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {previewUrls.map((url, i) => (
                <div key={url} className="relative size-20 overflow-hidden rounded-md">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {totalImages < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-20 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <ImagePlus className="size-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 제출 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : isEdit ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
