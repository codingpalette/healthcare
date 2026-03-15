"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { CalendarIcon, Camera, Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { InbodyInput, InbodyRecord } from "@/entities/inbody"
import { useCreateInbodyRecord, useUpdateInbodyRecord } from "@/features/inbody"
import { compressImageToWebP } from "@/shared/lib/media"
import { formatLocalDateValue, parseDateValue } from "@/shared/lib/inbody"
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui"

interface InbodyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editRecord?: InbodyRecord
  defaultDate?: string
}

function formatDateLabel(value: string) {
  return parseDateValue(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function parseNumberField(value: string, isEdit: boolean) {
  if (!value.trim()) {
    return isEdit ? null : undefined
  }

  return Number(value)
}

const MAX_IMAGES = 5

export function InbodyForm({ open, onOpenChange, editRecord, defaultDate }: InbodyFormProps) {
  const createRecord = useCreateInbodyRecord()
  const updateRecord = useUpdateInbodyRecord()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogContentRef = useRef<HTMLDivElement>(null)

  const [measuredDate, setMeasuredDate] = useState(
    editRecord?.measuredDate ?? defaultDate ?? formatLocalDateValue(new Date())
  )
  const [weight, setWeight] = useState(editRecord?.weight?.toString() ?? "")
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState(
    editRecord?.skeletalMuscleMass?.toString() ?? ""
  )
  const [bodyFatPercentage, setBodyFatPercentage] = useState(
    editRecord?.bodyFatPercentage?.toString() ?? ""
  )
  const [bodyMassIndex, setBodyMassIndex] = useState(editRecord?.bodyMassIndex?.toString() ?? "")
  const [bodyFatMass, setBodyFatMass] = useState(editRecord?.bodyFatMass?.toString() ?? "")
  const [memo, setMemo] = useState(editRecord?.memo ?? "")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(editRecord?.photoUrls ?? [])

  const isSubmitting = createRecord.isPending || updateRecord.isPending
  const selectedDate = parseDateValue(measuredDate)
  const totalPhotos = photoPreviews.length

  useEffect(() => {
    return () => {
      for (const url of photoPreviews) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url)
      }
    }
  }, [photoPreviews])

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const available = MAX_IMAGES - totalPhotos
    if (files.length > available) {
      toast.error(`최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다`)
    }

    const toProcess = files.slice(0, Math.max(0, available))
    const newPhotos: File[] = []
    const newPreviews: string[] = []

    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드할 수 있습니다")
        continue
      }
      try {
        const compressed = await compressImageToWebP(file)
        newPhotos.push(compressed)
        newPreviews.push(URL.createObjectURL(compressed))
      } catch {
        toast.error("사진 압축에 실패했습니다")
      }
    }

    if (newPhotos.length) {
      setPhotos((prev) => [...prev, ...newPhotos])
      setPhotoPreviews((prev) => [...prev, ...newPreviews])
    }
    event.target.value = ""
  }

  function removePhoto(index: number) {
    const url = photoPreviews[index]
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url)
      const existingCount = (editRecord?.photoUrls ?? []).length
      const blobIndex = index - existingCount
      if (blobIndex >= 0) {
        setPhotos((prev) => prev.filter((_, i) => i !== blobIndex))
      }
    }
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const input: InbodyInput = {
      measuredDate,
      weight: parseNumberField(weight, !!editRecord),
      skeletalMuscleMass: parseNumberField(skeletalMuscleMass, !!editRecord),
      bodyFatPercentage: parseNumberField(bodyFatPercentage, !!editRecord),
      bodyMassIndex: parseNumberField(bodyMassIndex, !!editRecord),
      bodyFatMass: parseNumberField(bodyFatMass, !!editRecord),
      memo: editRecord ? memo : memo || undefined,
    }

    if (editRecord) {
      const existingPhotoUrls = photoPreviews.filter((url) => !url.startsWith("blob:"))
      await updateRecord.mutateAsync({
        id: editRecord.id,
        input,
        photos: photos.length ? photos : undefined,
        existingPhotoUrls,
      })
    } else {
      await createRecord.mutateAsync({ input, photos: photos.length ? photos : undefined })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editRecord ? "인바디 수정" : "인바디 기록"}</DialogTitle>
          <DialogDescription>
            체중, 골격근량, 체지방률과 측정 사진을 함께 기록하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inbody-date">측정 날짜</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger
                  id="inbody-date"
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    />
                  }
                >
                  <span>{formatDateLabel(measuredDate)}</span>
                  <CalendarIcon data-icon="inline-end" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-3">
                  <Calendar
                    mode="single"
                    defaultMonth={selectedDate}
                    selected={selectedDate}
                    onSelect={(nextDate: Date | undefined) => {
                      if (!nextDate) return
                      setMeasuredDate(formatLocalDateValue(nextDate))
                      setIsDatePickerOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">체중 (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="70.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skeletal-muscle-mass">골격근량 (kg)</Label>
              <Input
                id="skeletal-muscle-mass"
                type="number"
                step="0.1"
                min="0"
                value={skeletalMuscleMass}
                onChange={(event) => setSkeletalMuscleMass(event.target.value)}
                placeholder="30.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-fat-percentage">체지방률 (%)</Label>
              <Input
                id="body-fat-percentage"
                type="number"
                step="0.1"
                min="0"
                value={bodyFatPercentage}
                onChange={(event) => setBodyFatPercentage(event.target.value)}
                placeholder="18.2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-mass-index">BMI</Label>
              <Input
                id="body-mass-index"
                type="number"
                step="0.1"
                min="0"
                value={bodyMassIndex}
                onChange={(event) => setBodyMassIndex(event.target.value)}
                placeholder="22.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-fat-mass">체지방량 (kg)</Label>
              <Input
                id="body-fat-mass"
                type="number"
                step="0.1"
                min="0"
                value={bodyFatMass}
                onChange={(event) => setBodyFatMass(event.target.value)}
                placeholder="12.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <textarea
              id="memo"
              className="flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="측정 컨디션, 특이사항을 남겨두세요"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>인바디 인증 사진</Label>
              <span className="text-xs text-muted-foreground">{totalPhotos}/{MAX_IMAGES}</span>
            </div>
            {totalPhotos > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((url, index) => (
                  <div key={url} className="relative overflow-hidden rounded-xl border bg-muted">
                    <Image
                      src={url}
                      alt={`인바디 인증 사진 ${index + 1}`}
                      width={320}
                      height={240}
                      className="aspect-[4/3] w-full object-cover"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="absolute top-1.5 right-1.5"
                      onClick={() => removePhoto(index)}
                      aria-label={`사진 ${index + 1} 삭제`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {totalPhotos < MAX_IMAGES && (
                  <button
                    type="button"
                    className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-input bg-muted/40 text-muted-foreground hover:border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="size-5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-muted/40 text-sm text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-5 text-primary" />
                <span>인바디 사진을 업로드하세요</span>
                <span className="text-xs">업로드한 이미지는 WebP로 압축됩니다 (최대 {MAX_IMAGES}장)</span>
              </button>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />
            {totalPhotos === 0 && (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                사진 선택
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : editRecord ? "인바디 수정" : "인바디 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
