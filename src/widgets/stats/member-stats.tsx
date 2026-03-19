"use client"

import { useState } from "react"
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { UserPlus, Users } from "lucide-react"
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
import { useMemberStats } from "@/features/stats"

const signupChartConfig = {
  count: {
    label: "신규 가입",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const retentionChartConfig = {
  rate: {
    label: "유지율",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

// YYYY-MM → 그대로, YYYY-MM-DD → M/D 형식
function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const parts = dateStr.split("-")
  if (parts.length === 2) {
    // YYYY-MM
    return dateStr
  }
  // YYYY-MM-DD
  const [, month, day] = parts
  return `${parseInt(month)}/${parseInt(day)}`
}

export function MemberStatsWidget() {
  const [period, setPeriod] = useState<30 | 90 | 365>(90)
  const { data: result, isLoading, isError } = useMemberStats(period)

  const totalMembers = result?.totalMembers ?? 0
  const activeMembers = result?.activeMembers ?? 0
  const inactiveMembers = result?.inactiveMembers ?? 0
  const newThisMonth = result?.newThisMonth ?? 0
  const newLastMonth = result?.newLastMonth ?? 0
  const newDiff = newThisMonth - newLastMonth

  return (
    <div className="space-y-4">
      {/* 요약 카드 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 전체 회원 수 */}
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
                  <p className="text-sm text-muted-foreground">전체 회원</p>
                  <p className="text-3xl font-bold">{totalMembers.toLocaleString()}명</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    활성 {activeMembers.toLocaleString()}명 · 비활성 {inactiveMembers.toLocaleString()}명
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 이번 달 신규 가입 */}
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
                  <UserPlus className="w-6 h-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">이번 달 신규 가입</p>
                  <p className="text-3xl font-bold">{newThisMonth.toLocaleString()}명</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    전월 대비{" "}
                    <span
                      className={
                        newDiff > 0
                          ? "text-green-500"
                          : newDiff < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }
                    >
                      {newDiff > 0 ? `+${newDiff}명` : newDiff < 0 ? `${newDiff}명` : "변동 없음"}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 신규 가입 추이 BarChart */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>신규 가입 추이</CardTitle>
            <CardDescription>
              {period === 30 ? "최근 30일 일별" : period === 90 ? "최근 90일" : "최근 1년 월별"} 신규 가입자 수
            </CardDescription>
          </div>
          <Tabs
            value={String(period)}
            onValueChange={(v) => setPeriod(Number(v) as 30 | 90 | 365)}
          >
            <TabsList>
              <TabsTrigger value="30">30일</TabsTrigger>
              <TabsTrigger value="90">90일</TabsTrigger>
              <TabsTrigger value="365">1년</TabsTrigger>
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
          ) : !result || result.signupTrend.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              표시할 데이터가 없습니다.
            </div>
          ) : (
            <ChartContainer config={signupChartConfig} className="h-[250px] w-full">
              <BarChart data={result.signupTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatDate}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* 하단 2컬럼: 월별 유지율 LineChart + 비활성 회원 Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 월별 유지율 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 유지율</CardTitle>
            <CardDescription>월별 회원 유지율 추이</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : isError ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                데이터를 불러오지 못했습니다.
              </div>
            ) : !result || result.retentionTrend.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <ChartContainer config={retentionChartConfig} className="h-[220px] w-full">
                <LineChart data={result.retentionTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                    width={40}
                    unit="%"
                    domain={[0, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="natural"
                    dataKey="rate"
                    stroke="var(--color-rate)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 비활성 회원 */}
        <Card>
          <CardHeader>
            <CardTitle>비활성 회원</CardTitle>
            <CardDescription>최근 출석이 없는 회원 목록</CardDescription>
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
            ) : !result || result.inactiveList.length === 0 ? (
              <div className="text-muted-foreground text-sm">비활성 회원이 없습니다.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead className="text-right">마지막 출석일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.inactiveList.slice(0, 10).map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-right">
                        {member.lastAttendance ?? "기록 없음"}
                      </TableCell>
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
