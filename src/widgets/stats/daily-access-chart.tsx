"use client"

import { useState, useId } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
} from "@/shared/ui"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart"
import { useDailyAccessStats } from "@/features/stats"
import { cn } from "@/shared/lib/utils"

const chartConfig = {
  count: {
    label: "접속자 수",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

function formatXAxisDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}/${parseInt(day)}`
}

function formatTooltipDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${parseInt(month)}월 ${parseInt(day)}일`
}

export function DailyAccessChart() {
  const [period, setPeriod] = useState<7 | 30>(30)
  const { data: result, isLoading, isError } = useDailyAccessStats()

  const chartData = result
    ? period === 7
      ? result.data.slice(-7)
      : result.data
    : []

  const average =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length)
      : 0

  const today = result?.today ?? 0
  const yesterday = result?.yesterday ?? 0
  const diff = today - yesterday

  // 그라디언트 고유 ID
  const gradientId = `gradient-count-${useId().replace(/:/g, "")}`

  return (
    <div className="space-y-4">
      {/* 오늘 접속자 요약 카드 */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-16 w-48" />
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
                <p className="text-sm text-muted-foreground">오늘 접속자</p>
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

      {/* 일별 접속 현황 차트 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>일별 접속 현황</CardTitle>
            <CardDescription>
              최근 {period}일간 일별 접속자 수
            </CardDescription>
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
            <Skeleton className="h-[250px] w-full" />
          ) : isError ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              데이터를 불러오지 못했습니다.
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              표시할 데이터가 없습니다.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-count)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-count)"
                      stopOpacity={0.05}
                    />
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
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={32}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const dateStr = payload?.[0]?.payload?.date as string | undefined
                        return dateStr ? formatTooltipDate(dateStr) : ""
                      }}
                    />
                  }
                />
                <Area
                  type="natural"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>

        {!isLoading && !isError && chartData.length > 0 && (
          <CardFooter className="text-sm text-muted-foreground">
            {period}일 평균 일별 접속자:{" "}
            <span className="ml-1 font-medium text-foreground">{average.toLocaleString()}명</span>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
