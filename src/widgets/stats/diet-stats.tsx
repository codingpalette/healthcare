"use client"

import { useState, useId } from "react"
import { Area, AreaChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { UtensilsCrossed } from "lucide-react"
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
import { useDietStats } from "@/features/stats"

type NutrientKey = "avgCalories" | "avgCarbs" | "avgProtein" | "avgFat"

const NUTRIENT_CONFIG: Record<NutrientKey, { label: string; unit: string }> = {
  avgCalories: { label: "칼로리", unit: "kcal" },
  avgCarbs: { label: "탄수화물", unit: "g" },
  avgProtein: { label: "단백질", unit: "g" },
  avgFat: { label: "지방", unit: "g" },
}

const areaChartConfig = {
  submitRate: {
    label: "제출률",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const nutrientChartConfig = {
  avgCalories: { label: "칼로리", color: "hsl(var(--chart-2))" },
  avgCarbs: { label: "탄수화물", color: "hsl(var(--chart-2))" },
  avgProtein: { label: "단백질", color: "hsl(var(--chart-2))" },
  avgFat: { label: "지방", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

function formatXAxisDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

export function DietStatsWidget() {
  const [period, setPeriod] = useState<7 | 30>(30)
  const [nutrient, setNutrient] = useState<NutrientKey>("avgCalories")
  const { data: result, isLoading, isError } = useDietStats(period)

  const gradientId = `gradient-diet-${useId().replace(/:/g, "")}`

  const todayRate = result?.todaySubmitRate ?? 0
  const yesterdayRate = result?.yesterdaySubmitRate ?? 0
  const diff = Math.round((todayRate - yesterdayRate) * 10) / 10
  const avgRate = result?.avgSubmitRate ?? 0

  return (
    <div className="space-y-4">
      {/* 요약 카드 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 식단 제출률 */}
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
                  <UtensilsCrossed className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">오늘 식단 제출률</p>
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

        {/* 기간 평균 제출률 */}
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
                  <UtensilsCrossed className="w-6 h-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">기간 평균 제출률</p>
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

      {/* 중단 2컬럼: 제출률 추이 + 영양소 추이 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 제출률 추이 AreaChart */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>제출률 추이</CardTitle>
              <CardDescription>최근 {period}일간 식단 제출률</CardDescription>
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
                      <stop offset="5%" stopColor="var(--color-submitRate)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-submitRate)" stopOpacity={0.05} />
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
                    dataKey="submitRate"
                    stroke="var(--color-submitRate)"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 영양소 추이 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle>영양소 추이</CardTitle>
            <CardDescription>일별 평균 {NUTRIENT_CONFIG[nutrient].label}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1 mb-4">
              {(Object.keys(NUTRIENT_CONFIG) as NutrientKey[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={nutrient === key ? "default" : "outline"}
                  onClick={() => setNutrient(key)}
                >
                  {NUTRIENT_CONFIG[key].label}
                </Button>
              ))}
            </div>
            {isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : isError ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                데이터를 불러오지 못했습니다.
              </div>
            ) : !result || result.dailyData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <ChartContainer config={nutrientChartConfig} className="h-[180px] w-full">
                <LineChart data={result.dailyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                    width={48}
                    unit={NUTRIENT_CONFIG[nutrient].unit}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="natural"
                    dataKey={nutrient}
                    stroke={`var(--color-${nutrient})`}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 하단: 회원별 성실도 Table */}
      <Card>
        <CardHeader>
          <CardTitle>회원별 성실도</CardTitle>
          <CardDescription>회원별 식단 제출 현황</CardDescription>
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
                  <TableHead className="text-right">제출률</TableHead>
                  <TableHead className="text-right">평균 칼로리</TableHead>
                  <TableHead className="text-right">최근 기록</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.memberStats.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-right">{Math.round(member.submitRate)}%</TableCell>
                    <TableCell className="text-right">{Math.round(member.avgCalories)}kcal</TableCell>
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
