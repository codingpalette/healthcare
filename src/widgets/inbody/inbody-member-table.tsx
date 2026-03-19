"use client"

import { useMemo, useState } from "react"
import { BellRing, Save, ScanSearch, Settings2, Users } from "lucide-react"
import { ImageGallery } from "@/shared/ui/image-gallery"
import { toast } from "sonner"
import type { InbodyMemberOverview } from "@/entities/inbody"
import {
  useMemberInbodyRecords,
  useMemberInbodyReminder,
  useTrainerInbodyOverview,
  useUpdateMemberInbodyReminder,
} from "@/features/inbody"
import { formatReminderText, getMonthRange, getNextReminderDate } from "@/shared/lib/inbody"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
} from "@/shared/ui"
import { InbodyMonthlyChart } from "@/widgets/inbody/inbody-monthly-chart"

function formatMeasureDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function MemberDetailDialog({
  member,
  open,
  onOpenChange,
}: {
  member: InbodyMemberOverview | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { from, to } = useMemo(() => getMonthRange(new Date(), 11), [])
  const { data: records, isLoading } = useMemberInbodyRecords(member?.memberId ?? "", from, to)
  const { data: reminder } = useMemberInbodyReminder(member?.memberId ?? "")
  const updateReminder = useUpdateMemberInbodyReminder()
  const [draftDay, setDraftDay] = useState<string | null>(null)
  const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null)

  const measurementDay = draftDay ?? String(reminder?.measurementDay ?? member?.reminderSetting?.measurementDay ?? 15)
  const enabled = draftEnabled ?? reminder?.enabled ?? member?.reminderSetting?.enabled ?? true

  async function handleSaveReminder() {
    if (!member) return
    const parsedDay = Number(measurementDay)

    if (!Number.isFinite(parsedDay) || parsedDay < 1 || parsedDay > 28) {
      toast.error("측정일은 1일부터 28일 사이로 입력해주세요")
      return
    }

    try {
      await updateReminder.mutateAsync({
        memberId: member.memberId,
        input: {
          measurementDay: parsedDay,
          enabled,
        },
      })
      setDraftDay(null)
      setDraftEnabled(null)
      toast.success("인바디 측정일 설정을 저장했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "측정일 설정 저장에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{member?.memberName ?? "회원"} 인바디 상세</DialogTitle>
          <DialogDescription>
            최근 인바디 기록을 확인하고 월별 측정일을 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {!member ? null : (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <InbodyMonthlyChart
                records={records ?? []}
                title="회원 월별 변화"
                description="최근 6개월의 체중, 골격근량, 체지방률 추이를 확인합니다."
              />

              <Card className="border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="size-4 text-primary" />
                    측정일 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">{formatReminderText(reminder ?? member.reminderSetting)}</p>
                    {(reminder ?? member.reminderSetting)?.enabled ? (
                      <p className="mt-2 text-sm font-medium text-primary">
                        다음 예정일: {formatMeasureDate(getNextReminderDate(reminder ?? member.reminderSetting!))}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder-day">매월 측정일</Label>
                    <Input
                      id="reminder-day"
                      type="number"
                      min="1"
                      max="28"
                      value={measurementDay}
                      onChange={(event) => setDraftDay(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      월별 말일 오차를 줄이기 위해 28일까지 설정합니다.
                    </p>
                  </div>

                  <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
                    <span>알림 사용</span>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={enabled}
                      onChange={(event) => setDraftEnabled(event.target.checked)}
                    />
                  </label>

                  <Button
                    className="w-full"
                    onClick={handleSaveReminder}
                    disabled={updateReminder.isPending}
                  >
                    <Save className="size-4" />
                    {updateReminder.isPending ? "저장 중..." : "측정일 저장"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-medium">최근 기록</h3>
                <p className="text-sm text-muted-foreground">회원의 최근 12개월 인바디 측정 내역입니다.</p>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 w-full" />
                  ))}
                </div>
              ) : !records?.length ? (
                <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  아직 등록된 인바디 기록이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div key={record.id} className="rounded-xl border bg-card p-4">
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="w-full md:w-40 shrink-0">
                          <ImageGallery
                            urls={record.photoUrls}
                            alt="회원 인바디 사진"
                            emptyIcon={<ScanSearch className="size-7 text-primary" />}
                            emptyText="등록된 인바디 사진이 없습니다"
                            aspectClassName="aspect-square"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{formatMeasureDate(record.measuredDate)}</Badge>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <MetricCard label="체중" value={record.weight} unit="kg" />
                            <MetricCard label="골격근량" value={record.skeletalMuscleMass} unit="kg" />
                            <MetricCard label="체지방률" value={record.bodyFatPercentage} unit="%" />
                            <MetricCard label="BMI" value={record.bodyMassIndex} unit="" />
                            <MetricCard label="체지방량" value={record.bodyFatMass} unit="kg" />
                          </div>
                          <div className="mt-3 rounded-xl bg-muted/50 p-3">
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InbodyMemberTable() {
  const { data: members, isLoading } = useTrainerInbodyOverview()
  const [selectedMember, setSelectedMember] = useState<InbodyMemberOverview | null>(null)

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="size-4 text-primary" />
            </div>
            회원 인바디 현황
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            담당 회원의 최신 인바디 기록과 월별 측정일을 함께 관리하세요.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 w-full" />
              ))}
            </div>
          ) : !members?.length ? (
            <p className="rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              아직 담당 회원이 없거나 등록된 인바디 기록이 없습니다.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {members.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  className="rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/20"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{member.memberName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {member.latestRecord
                          ? `최근 측정일 ${formatMeasureDate(member.latestRecord.measuredDate)}`
                          : "아직 등록된 측정 기록 없음"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {member.reminderSetting?.enabled ? `매월 ${member.reminderSetting.measurementDay}일` : "알림 없음"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetricCard label="체중" value={member.latestRecord?.weight ?? null} unit="kg" />
                    <MetricCard
                      label="골격근량"
                      value={member.latestRecord?.skeletalMuscleMass ?? null}
                      unit="kg"
                    />
                    <MetricCard
                      label="체지방률"
                      value={member.latestRecord?.bodyFatPercentage ?? null}
                      unit="%"
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <BellRing className="size-4 text-primary" />
                    {member.reminderSetting?.enabled
                      ? `다음 측정 예정일 ${formatMeasureDate(getNextReminderDate(member.reminderSetting))}`
                      : "측정일이 아직 설정되지 않았습니다."}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MemberDetailDialog
        key={selectedMember?.memberId ?? "empty"}
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null)
        }}
      />
    </>
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
