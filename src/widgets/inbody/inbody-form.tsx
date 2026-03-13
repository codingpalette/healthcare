"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { CalendarIcon, Camera, X } from "lucide-react"
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

function revokePreviewUrl(url: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

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
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(editRecord?.photoUrl ?? null)
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false)

  const isSubmitting = createRecord.isPending || updateRecord.isPending
  const selectedDate = parseDateValue(measuredDate)

  useEffect(() => {
    return () => {
      revokePreviewUrl(photoPreview)
    }
  }, [photoPreview])

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다")
      event.target.value = ""
      return
    }

    try {
      const compressedPhoto = await compressImageToWebP(file)
      revokePreviewUrl(photoPreview)
      setPhoto(compressedPhoto)
      setPhotoPreview(URL.createObjectURL(compressedPhoto))
      setIsPhotoRemoved(false)
      event.target.value = ""
    } catch {
      toast.error("사진 압축에 실패했습니다")
      event.target.value = ""
    }
  }

  function removePhoto() {
    revokePreviewUrl(photoPreview)
    setPhoto(null)
    setPhotoPreview(null)
    setIsPhotoRemoved(Boolean(editRecord?.photoUrl))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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
      await updateRecord.mutateAsync({
        id: editRecord.id,
        input,
        photo: photo ?? undefined,
        removePhoto: isPhotoRemoved,
      })
    } else {
      await createRecord.mutateAsync({ input, photo: photo ?? undefined })
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
                <PopoverContent align="start" className="w-auto p-3" container={dialogContentRef}>
                  <Calendar
                    defaultMonth={selectedDate}
                    selected={selectedDate}
                    onSelect={(nextDate) => {
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
            <Label>인바디 인증 사진</Label>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-xl border bg-muted">
                <Image
                  src={photoPreview}
                  alt="인바디 인증 미리보기"
                  width={960}
                  height={720}
                  className="aspect-[4/3] w-full object-cover"
                  unoptimized
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-3 right-3"
                  onClick={removePhoto}
                  aria-label="사진 선택 해제"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-muted/40 text-sm text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-5 text-primary" />
                <span>인바디 사진을 업로드하세요</span>
                <span className="text-xs">업로드한 이미지는 WebP로 압축됩니다</span>
              </button>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {!photoPreview && (
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
