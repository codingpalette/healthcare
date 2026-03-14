"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { BellRing, Pencil, Plus, ScanLine, Trash2, Weight } from "lucide-react"
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
  Badge,
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

export function InbodyRecordList() {
  const { from, to } = useMemo(() => getMonthRange(new Date(), 11), [])
  const { data: records, isLoading } = useMyInbodyRecords(from, to)
  const { data: reminder } = useMyInbodyReminder()
  const deleteRecord = useDeleteInbodyRecord()
  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<InbodyRecord | undefined>()
  const [recordToDelete, setRecordToDelete] = useState<InbodyRecord | undefined>()

  const latestRecord = records?.[0] ?? null
  const nextReminderDate = reminder?.enabled ? getNextReminderDate(reminder) : null

  return (
    <div className="space-y-6">
      <InbodyMonthlyChart records={records ?? []} />

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">인바디 기록</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                최근 12개월 인바디 기록과 측정 사진을 관리하세요.
              </p>
            </div>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              기록 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {latestRecord ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">최근 체중</p>
                <p className="mt-2 text-2xl font-semibold">
                  {latestRecord.weight != null ? `${latestRecord.weight.toFixed(1)}kg` : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">최근 골격근량</p>
                <p className="mt-2 text-2xl font-semibold">
                  {latestRecord.skeletalMuscleMass != null
                    ? `${latestRecord.skeletalMuscleMass.toFixed(1)}kg`
                    : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">최근 체지방률</p>
                <p className="mt-2 text-2xl font-semibold">
                  {latestRecord.bodyFatPercentage != null
                    ? `${latestRecord.bodyFatPercentage.toFixed(1)}%`
                    : "-"}
                </p>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full" />
              ))}
            </div>
          ) : !records?.length ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
              <Weight className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-medium">아직 기록된 인바디가 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                최근 측정값을 추가하면 변화 추이를 바로 볼 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex flex-col gap-4 md:flex-row">
                    {record.photoUrl ? (
                      <Image
                        src={record.photoUrl}
                        alt="인바디 기록 사진"
                        width={180}
                        height={180}
                        className="h-40 w-full rounded-xl object-cover md:w-48"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center rounded-xl bg-primary/5 md:w-48">
                        <ScanLine className="size-8 text-primary" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{formatMeasureDate(record.measuredDate)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {record.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => {
                            setEditRecord(record)
                            setFormOpen(true)
                          }}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="인바디 삭제"
                            onClick={() => setRecordToDelete(record)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <MetricCard label="체중" value={record.weight} unit="kg" />
                        <MetricCard label="골격근량" value={record.skeletalMuscleMass} unit="kg" />
                        <MetricCard label="체지방률" value={record.bodyFatPercentage} unit="%" />
                        <MetricCard label="BMI" value={record.bodyMassIndex} unit="" />
                        <MetricCard label="체지방량" value={record.bodyFatMass} unit="kg" />
                      </div>

                      <div className="mt-3 rounded-xl bg-muted/60 p-3">
                        <p className="text-xs text-muted-foreground">메모</p>
                        <p className="mt-1 text-sm">
                          {record.memo?.trim() ? record.memo : "작성된 메모가 없습니다."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

function MetricCard({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {value != null ? `${value.toFixed(1)}${unit}` : "-"}
      </p>
    </div>
  )
}
