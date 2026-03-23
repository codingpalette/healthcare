"use client"

import { useMemo, useState } from "react"
import { BellRing, Camera, Pencil, Plus, Trash2, Weight, X } from "lucide-react"
import { ImageGallery } from "@/shared/ui/image-gallery"
import type { InbodyRecord } from "@/entities/inbody"
import { useDeleteInbodyRecord, useMyInbodyRecords, useMyInbodyReminder } from "@/features/inbody"
import { formatReminderText, getMonthRange, getNextReminderDate } from "@/shared/lib/inbody"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/shared/ui"
import { InbodyForm } from "@/widgets/inbody/inbody-form"
import { InbodyMonthlyChart } from "@/widgets/inbody/inbody-monthly-chart"

function formatMeasureDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** 신체변화 표에서 사용하는 짧은 날짜 포맷 (YY.MM.DD) */
function formatShortDate(value: string) {
  const d = new Date(`${value}T00:00:00`)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yy}.${mm}.${dd}`
}

/** 인바디 지표 행 정의 */
const METRIC_ROWS = [
  { key: "weight" as const, label: "체중", subLabel: "Weight", unit: "(kg)" },
  { key: "skeletalMuscleMass" as const, label: "골격근량", subLabel: "Skeletal Muscle Mass", unit: "(kg)" },
  { key: "bodyFatPercentage" as const, label: "체지방률", subLabel: "Percent Body Fat", unit: "(%)" },
  { key: "bodyMassIndex" as const, label: "BMI", subLabel: "Body Mass Index", unit: "(kg/m²)" },
  { key: "bodyFatMass" as const, label: "체지방량", subLabel: "Body Fat Mass", unit: "(kg)" },
] as const

export function InbodyRecordList() {
  const { from, to } = useMemo(() => getMonthRange(new Date(), 11), [])
  const { data: records, isLoading } = useMyInbodyRecords(from, to)
  const { data: reminder } = useMyInbodyReminder()
  const deleteRecord = useDeleteInbodyRecord()
  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<InbodyRecord | undefined>()
  const [recordToDelete, setRecordToDelete] = useState<InbodyRecord | undefined>()
  const [selectedRecord, setSelectedRecord] = useState<InbodyRecord | null>(null)

  const nextReminderDate = reminder?.enabled ? getNextReminderDate(reminder) : null

  // 날짜 오래된 순 → 최신순 (왼쪽→오른쪽)으로 정렬
  const sortedRecords = useMemo(
    () => [...(records ?? [])].sort((a, b) => a.measuredDate.localeCompare(b.measuredDate)),
    [records],
  )

  return (
    <div className="space-y-6">
      <InbodyMonthlyChart records={records ?? []} />

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">신체변화</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Body Composition History</p>
            </div>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              기록 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 측정 알림 */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <BellRing className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">측정 알림</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatReminderText(reminder ?? null)}</p>
                {nextReminderDate ? (
                  <p className="mt-2 text-sm font-medium text-primary">
                    다음 측정 예정일: {formatMeasureDate(nextReminderDate)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* 신체변화 표 */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : !sortedRecords.length ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Weight className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-medium">아직 기록된 인바디가 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                최근 측정값을 추가하면 변화 추이를 바로 볼 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {/* 지표 행들 */}
                  {METRIC_ROWS.map((metric, rowIdx) => (
                    <tr
                      key={metric.key}
                      className={rowIdx % 2 === 0 ? "bg-muted/30" : "bg-card"}
                    >
                      {/* 지표 라벨 (고정 열) */}
                      <th className="sticky left-0 z-10 min-w-[110px] border-r bg-inherit px-3 py-3 text-left font-semibold">
                        <div className="flex items-baseline gap-1.5">
                          <span>{metric.label}</span>
                          <span className="text-xs font-normal text-muted-foreground">{metric.unit}</span>
                        </div>
                        <p className="text-[10px] font-normal text-muted-foreground leading-tight">{metric.subLabel}</p>
                      </th>
                      {/* 각 측정일 값 */}
                      {sortedRecords.map((record) => {
                        const val = record[metric.key]
                        return (
                          <td
                            key={record.id}
                            className="min-w-[72px] border-r px-3 py-3 text-center font-medium tabular-nums last:border-r-0"
                          >
                            {val != null ? val.toFixed(1) : "-"}
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* 측정일 행 — 클릭하면 사진/메모 상세 보기 */}
                  <tr className="border-t-2 bg-muted/50">
                    <th className="sticky left-0 z-10 border-r bg-inherit px-3 py-2.5 text-left">
                      <span className="text-xs font-semibold">측정일</span>
                    </th>
                    {sortedRecords.map((record) => {
                      const isSelected = selectedRecord?.id === record.id
                      return (
                        <td
                          key={record.id}
                          className={`border-r px-2 py-2.5 text-center last:border-r-0 cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary/30" : "hover:bg-muted/80"
                          }`}
                          onClick={() => setSelectedRecord(isSelected ? null : record)}
                        >
                          <p className="text-xs font-medium tabular-nums">{formatShortDate(record.measuredDate)}</p>
                          {record.photoUrls.length > 0 && (
                            <Camera className="mx-auto mt-1 size-3 text-muted-foreground" />
                          )}
                        </td>
                      )
                    })}
                  </tr>

                  {/* 편집/삭제 액션 행 */}
                  <tr className="border-t bg-card">
                    <th className="sticky left-0 z-10 border-r bg-inherit px-3 py-2" />
                    {sortedRecords.map((record) => (
                      <td key={record.id} className="border-r px-1 py-1.5 text-center last:border-r-0">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditRecord(record)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="인바디 삭제"
                            onClick={() => setRecordToDelete(record)}
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 선택된 기록의 사진/메모 상세 */}
            {selectedRecord && (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">
                    {formatMeasureDate(selectedRecord.measuredDate)} 측정 상세
                  </p>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelectedRecord(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="w-full md:w-72 shrink-0">
                    <ImageGallery
                      urls={selectedRecord.photoUrls}
                      alt="인바디 기록 사진"
                      emptyIcon={<Camera className="size-8 text-primary" />}
                      emptyText="등록된 인바디 사진이 없습니다"
                      aspectClassName="aspect-square"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">메모</p>
                      <p className="mt-1 text-sm">
                        {selectedRecord.memo?.trim() ? selectedRecord.memo : "작성된 메모가 없습니다."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>

      <InbodyForm
        key={`${editRecord?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditRecord(undefined)
        }}
        editRecord={editRecord}
      />

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => {
        if (!open) setRecordToDelete(undefined)
      }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>인바디 기록을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 인바디 기록과 측정 사진은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!recordToDelete) return
                deleteRecord.mutate(recordToDelete.id)
                setRecordToDelete(undefined)
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
