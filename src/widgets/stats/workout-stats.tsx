"use client"

import { useState, useId } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Dumbbell } from "lucide-react"
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
} from "@/shared/ui"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart"
import { useWorkoutStats } from "@/features/stats"

const areaChartConfig = {
  recordRate: {
    label: "기록률",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const barChartConfig = {
  count: {
    label: "횟수",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

function formatXAxisDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function WorkoutStatsWidget() {
  const [period, setPeriod] = useState<7 | 30>(30)
  const { data: result, isLoading, isError } = useWorkoutStats(period)

  const gradientId = `gradient-workout-${useId().replace(/:/g, "")}`

  const todayRate = result?.todayRecordRate ?? 0
  const yesterdayRate = result?.yesterdayRecordRate ?? 0
  const diff = Math.round((todayRate - yesterdayRate) * 10) / 10
  const avgRate = result?.avgRecordRate ?? 0

  // TOP 10 인기 운동
  const topExercises = result?.exerciseDistribution.slice(0, 10) ?? []

  return (
    <div className="space-y-4">
      {/* 요약 카드 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 운동 기록률 */}
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
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">오늘 운동 기록률</p>
                  <p className="text-3xl font-bold">{Math.round(todayRate)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    어제 대비{" "}
                    <span
                      className={
                        diff > 0
                          ? "text-green-500"
                          : diff < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }
                    >
                      {diff > 0 ? `+${diff}%p` : diff < 0 ? `${diff}%p` : "변동 없음"}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기간 평균 기록률 */}
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
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-chart-3/10">
                  <Dumbbell className="w-6 h-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">기간 평균 기록률</p>
                  <p className="text-3xl font-bold">{Math.round(avgRate)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    최근 {period}일 평균
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 중단 2컬럼: 기록률 추이 + 인기 운동 TOP 10 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 기록률 추이 AreaChart */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>기록률 추이</CardTitle>
              <CardDescription>최근 {period}일간 운동 기록률</CardDescription>
            </div>
            <Tabs
              value={String(period)}
              onValueChange={(v) => setPeriod(Number(v) as 7 | 30)}
            >
              <TabsList>
                <TabsTrigger value="7">7일</TabsTrigger>
                <TabsTrigger value="30">30일</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : isError ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                데이터를 불러오지 못했습니다.
              </div>
            ) : !result || result.dailyData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <ChartContainer config={areaChartConfig} className="h-[220px] w-full">
                <AreaChart data={result.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-recordRate)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-recordRate)" stopOpacity={0.05} />
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
                    dataKey="recordRate"
                    stroke="var(--color-recordRate)"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 인기 운동 TOP 10 BarChart (가로) */}
        <Card>
          <CardHeader>
            <CardTitle>인기 운동 TOP 10</CardTitle>
            <CardDescription>가장 많이 기록된 운동 순위</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : isError ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                데이터를 불러오지 못했습니다.
              </div>
            ) : topExercises.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[220px] w-full">
                <BarChart
                  data={topExercises}
                  layout="vertical"
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    type="category"
                    dataKey="exerciseName"
                    width={80}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 하단: 회원별 운동 빈도 Table */}
      <Card>
        <CardHeader>
          <CardTitle>회원별 운동 빈도</CardTitle>
          <CardDescription>회원별 운동 기록 현황</CardDescription>
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
          ) : !result || result.memberStats.length === 0 ? (
            <div className="text-muted-foreground text-sm">데이터가 없습니다.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="text-right">기록률</TableHead>
                  <TableHead className="text-right">총 횟수</TableHead>
                  <TableHead>인기 운동</TableHead>
                  <TableHead className="text-right">최근 기록</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.memberStats.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-right">{Math.round(member.recordRate)}%</TableCell>
                    <TableCell className="text-right">{member.totalWorkouts}회</TableCell>
                    <TableCell>{member.topExercise ?? "-"}</TableCell>
                    <TableCell className="text-right">{member.lastRecordDate ?? "기록 없음"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
