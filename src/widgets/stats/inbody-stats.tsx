"use client"

import { useState } from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Activity, AlertCircle } from "lucide-react"
import { useQueries } from "@tanstack/react-query"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from "@/shared/ui"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart"
import { useInbodyStats } from "@/features/stats"
import { getMemberInbodyRecords } from "@/entities/inbody"
import type { InbodyRecord } from "@/entities/inbody"
import { cn } from "@/shared/lib/utils"

type MetricKey = "avgWeight" | "avgMuscleMass" | "avgBodyFatPct"

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string }> = {
  avgWeight: { label: "체중", unit: "kg" },
  avgMuscleMass: { label: "골격근량", unit: "kg" },
  avgBodyFatPct: { label: "체지방률", unit: "%" },
}

const COMPARE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
]

// InbodyRecord 필드 매핑
function getRecordValue(record: InbodyRecord, metric: MetricKey): number | null {
  if (metric === "avgWeight") return record.weight
  if (metric === "avgMuscleMass") return record.skeletalMuscleMass
  return record.bodyFatPercentage
}

const trendChartConfig = {
  avgWeight: { label: "체중", color: "hsl(var(--chart-1))" },
  avgMuscleMass: { label: "골격근량", color: "hsl(var(--chart-1))" },
  avgBodyFatPct: { label: "체지방률", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const compareChartConfig = {
  member0: { label: "회원 1", color: COMPARE_COLORS[0] },
  member1: { label: "회원 2", color: COMPARE_COLORS[1] },
  member2: { label: "회원 3", color: COMPARE_COLORS[2] },
} satisfies ChartConfig

export function InbodyStatsWidget() {
  const [months, setMonths] = useState<3 | 6 | 12>(6)
  const [metric, setMetric] = useState<MetricKey>("avgWeight")
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const { data: result, isLoading, isError } = useInbodyStats(months)

  // 비교 차트를 위한 시작 날짜 계산
  const startDate = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - months)
    return d.toISOString().split("T")[0]
  })()

  const memberQueries = useQueries({
    queries: selectedMemberIds.map((id) => ({
      queryKey: ["inbody", "members", id, startDate],
      queryFn: () => getMemberInbodyRecords(id, { from: startDate }),
      staleTime: 5 * 60 * 1000,
    })),
  })

  // 회원 선택 토글 (최대 3명)
  function toggleMember(userId: string) {
    setSelectedMemberIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      if (prev.length >= 3) return prev
      return [...prev, userId]
    })
  }

  // 비교 차트 데이터 생성
  const compareData = (() => {
    if (selectedMemberIds.length === 0) return []

    // 모든 측정일 수집
    const allDates = new Set<string>()
    memberQueries.forEach((q) => {
      if (q.data) {
        q.data.forEach((r) => allDates.add(r.measuredDate))
      }
    })

    const sortedDates = Array.from(allDates).sort()

    return sortedDates.map((date) => {
      const entry: Record<string, string | number | null> = { measuredDate: date }
      memberQueries.forEach((q, idx) => {
        const record = q.data?.find((r) => r.measuredDate === date)
        entry[`member${idx}`] = record ? getRecordValue(record, metric) : null
      })
      return entry
    })
  })()

  const measuredThisMonth = result?.measuredThisMonth ?? 0
  const totalMembers = result?.totalMembers ?? 0
  const unmeasured = result?.unmeasuredThisMonth ?? 0
  const measureRate = totalMembers > 0 ? Math.round((measuredThisMonth / totalMembers) * 100) : 0

  return (
    <div className="space-y-4">
      {/* 요약 카드 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 이번 달 측정률 */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground text-sm">
              데이터를 불러오지 못했습니다.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">이번 달 측정률</p>
                  <p className="text-3xl font-bold">{measureRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {measuredThisMonth}/{totalMembers}명 측정
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 미측정 회원 수 */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground text-sm">
              데이터를 불러오지 못했습니다.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">미측정 회원</p>
                  <p className="text-3xl font-bold text-destructive">{unmeasured}명</p>
                  <p className="text-xs text-muted-foreground mt-1">이번 달 미측정</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 전체 평균 추이 LineChart */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>전체 평균 추이</CardTitle>
            <CardDescription>
              최근 {months}개월 평균 {METRIC_CONFIG[metric].label} 변화
            </CardDescription>
          </div>
          <Tabs
            value={String(months)}
            onValueChange={(v) => setMonths(Number(v) as 3 | 6 | 12)}
          >
            <TabsList>
              <TabsTrigger value="3">3개월</TabsTrigger>
              <TabsTrigger value="6">6개월</TabsTrigger>
              <TabsTrigger value="12">1년</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1 mb-4">
            {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={metric === key ? "default" : "outline"}
                onClick={() => setMetric(key)}
              >
                {METRIC_CONFIG[key].label}
              </Button>
            ))}
          </div>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : isError ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              데이터를 불러오지 못했습니다.
            </div>
          ) : !result || result.monthlyAvgTrend.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              표시할 데이터가 없습니다.
            </div>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[220px] w-full">
              <LineChart
                data={result.monthlyAvgTrend}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={48}
                  unit={METRIC_CONFIG[metric].unit}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="natural"
                  dataKey={metric}
                  stroke={`var(--color-${metric})`}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* 회원별 비교 차트 */}
      {selectedMemberIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>회원별 비교</CardTitle>
            <CardDescription>
              선택된 회원의 {METRIC_CONFIG[metric].label} 추이 비교 (최대 3명)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memberQueries.some((q) => q.isLoading) ? (
              <Skeleton className="h-[220px] w-full" />
            ) : compareData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <ChartContainer config={compareChartConfig} className="h-[220px] w-full">
                <LineChart
                  data={compareData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="measuredDate"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={48}
                    unit={METRIC_CONFIG[metric].unit}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {selectedMemberIds.map((id, idx) => {
                    const member = result?.memberOverview.find((m) => m.userId === id)
                    return (
                      <Line
                        key={id}
                        type="natural"
                        dataKey={`member${idx}`}
                        name={member?.name ?? id}
                        stroke={COMPARE_COLORS[idx]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* 측정 관리 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>측정 관리</CardTitle>
          <CardDescription>
            회원을 클릭하면 비교 차트에 추가됩니다 (최대 3명)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-muted-foreground text-sm">데이터를 불러오지 못했습니다.</div>
          ) : !result || result.memberOverview.length === 0 ? (
            <div className="text-muted-foreground text-sm">데이터가 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="text-right">최근 측정일</TableHead>
                  <TableHead className="text-right">체중</TableHead>
                  <TableHead className="text-right">골격근</TableHead>
                  <TableHead className="text-right">체지방률</TableHead>
                  <TableHead className="text-center">이번 달 측정</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.memberOverview.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.userId)
                  const isUnmeasured = !member.measuredThisMonth
                  return (
                    <TableRow
                      key={member.userId}
                      onClick={() => toggleMember(member.userId)}
                      className={cn(
                        "cursor-pointer",
                        isSelected && "bg-primary/10",
                        !isSelected && isUnmeasured && "bg-destructive/5"
                      )}
                    >
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-right">
                        {member.lastMeasuredDate ?? "기록 없음"}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.latestWeight != null ? `${member.latestWeight}kg` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.latestMuscleMass != null ? `${member.latestMuscleMass}kg` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.latestBodyFatPct != null ? `${member.latestBodyFatPct}%` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {member.measuredThisMonth ? "✓" : "✗"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
