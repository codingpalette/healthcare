"use client"

import { useState, useId } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
} from "@/shared/ui"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart"
import { useAttendanceStats } from "@/features/stats"
import { cn } from "@/shared/lib/utils"

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

// 요일별 데이터를 월~일 순서로 정렬 (weekday: [1,2,3,4,5,6,0])
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const areaChartConfig = {
  rate: {
    label: "출석률",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const barChartConfig = {
  avgCount: {
    label: "평균 출석자",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

function formatXAxisDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function AttendanceStats() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const { data: result, isLoading, isError } = useAttendanceStats(period)

  const gradientId = `gradient-rate-${useId().replace(/:/g, "")}`

  const today = result?.today ?? 0
  const yesterday = result?.yesterday ?? 0
  const diff = today - yesterday
  const totalMembers = result?.totalMembers ?? 0

  // 기간 평균 출석률 계산
  const avgRate =
    result && result.dailyData.length > 0
      ? Math.round(
          result.dailyData.reduce((sum, d) => sum + d.rate, 0) / result.dailyData.length
        )
      : 0

  // 요일별 데이터: 월~일 순서로 정렬
  const weekdayData = WEEKDAY_ORDER.map((wd) => {
    const found = result?.weekdayData.find((d) => d.weekday === wd)
    return {
      weekday: wd,
      label: WEEKDAY_LABELS[wd],
      avgCount: found?.avgCount ?? 0,
    }
  })

  return (
    <div className="space-y-4">
      {/* 요약 카드 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 출석자 수 */}
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
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">오늘 출석자</p>
                  <p className="text-3xl font-bold">{today.toLocaleString()}명</p>
                  <div className="flex items-center gap-1 mt-1">
                    {diff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : diff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        diff > 0
                          ? "text-green-500"
                          : diff < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      )}
                    >
                      어제 대비{" "}
                      {diff > 0 ? `+${diff}명` : diff < 0 ? `${diff}명` : "변동 없음"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기간 평균 출석률 */}
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
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-chart-2/10">
                  <Users className="w-6 h-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">기간 평균 출석률</p>
                  <p className="text-3xl font-bold">{avgRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    전체 회원 {totalMembers.toLocaleString()}명 기준
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 일별 출석률 추이 AreaChart */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>일별 출석률 추이</CardTitle>
            <CardDescription>최근 {period}일간 일별 출석률</CardDescription>
          </div>
          <Tabs
            value={String(period)}
            onValueChange={(v) => setPeriod(Number(v) as 7 | 30 | 90)}
          >
            <TabsList>
              <TabsTrigger value="7">7일</TabsTrigger>
              <TabsTrigger value="30">30일</TabsTrigger>
              <TabsTrigger value="90">90일</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : isError ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              데이터를 불러오지 못했습니다.
            </div>
          ) : !result || result.dailyData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              표시할 데이터가 없습니다.
            </div>
          ) : (
            <ChartContainer config={areaChartConfig} className="h-[250px] w-full">
              <AreaChart data={result.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-rate)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-rate)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatXAxisDate}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                  unit="%"
                  domain={[0, 100]}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const dateStr = payload?.[0]?.payload?.date as string | undefined
                        if (!dateStr) return ""
                        const [, month, day] = dateStr.split("-")
                        return `${parseInt(month)}월 ${parseInt(day)}일`
                      }}
                    />
                  }
                />
                <Area
                  type="natural"
                  dataKey="rate"
                  stroke="var(--color-rate)"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>

        {!isLoading && !isError && result && result.dailyData.length > 0 && (
          <CardFooter className="text-sm text-muted-foreground">
            {period}일 평균 출석률:{" "}
            <span className="ml-1 font-medium text-foreground">{avgRate}%</span>
          </CardFooter>
        )}
      </Card>

      {/* 하단 2컬럼: 요일별 BarChart + 출석률 랭킹 Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 요일별 평균 출석자 수 */}
        <Card>
          <CardHeader>
            <CardTitle>요일별 평균 출석자 수</CardTitle>
            <CardDescription>요일별 평균 출석자 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : isError ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                데이터를 불러오지 못했습니다.
              </div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[220px] w-full">
                <BarChart data={weekdayData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={32}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgCount" fill="var(--color-avgCount)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 출석률 랭킹 */}
        <Card>
          <CardHeader>
            <CardTitle>출석률 랭킹</CardTitle>
            <CardDescription>회원별 출석률 상위 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-muted-foreground text-sm">
                데이터를 불러오지 못했습니다.
              </div>
            ) : !result || result.memberRanking.length === 0 ? (
              <div className="text-muted-foreground text-sm">데이터가 없습니다.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead className="text-right">출석률</TableHead>
                    <TableHead className="text-right">출석일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.memberRanking.slice(0, 10).map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-right">{member.attendanceRate}%</TableCell>
                      <TableCell className="text-right">{member.totalDays}일</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
