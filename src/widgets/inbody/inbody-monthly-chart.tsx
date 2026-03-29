"use client"

import { useMemo, useState } from "react"
import { Activity, Scale, TrendingUp } from "lucide-react"
import type { InbodyRecord } from "@/entities/inbody"
import { buildMonthlyTrendData } from "@/entities/inbody"
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui"

type MetricKey = "weight" | "skeletalMuscleMass" | "bodyFatPercentage"

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string }> = {
  weight: { label: "체중", unit: "kg" },
  skeletalMuscleMass: { label: "골격근량", unit: "kg" },
  bodyFatPercentage: { label: "체지방률", unit: "%" },
}

function formatMetricValue(value: number | null, unit: string) {
  return value != null ? `${value.toFixed(1)}${unit}` : "-"
}

export function InbodyMonthlyChart({
  records,
  title = "월별 변화 추이",
  description = "최근 6개월 인바디 변화를 비교합니다.",
}: {
  records: InbodyRecord[]
  title?: string
  description?: string
}) {
  const [metric, setMetric] = useState<MetricKey>("weight")
  const trend = useMemo(() => buildMonthlyTrendData(records), [records])

  const values = trend.map((point) => point[metric]).filter((value): value is number => value != null)
  const minValue = values.length ? Math.min(...values) : 0
  const maxValue = values.length ? Math.max(...values) : 0
  const range = maxValue - minValue || 1

  const chartPoints = trend.map((point, index) => {
    const value = point[metric]
    const x = (index / Math.max(trend.length - 1, 1)) * 100
    const y = value == null ? 100 : 90 - (((value - minValue) / range) * 70 + 10)
    return { x, y, value, label: point.label }
  })

  const polyline = chartPoints
    .filter((point) => point.value != null)
    .map((point) => `${point.x},${point.y}`)
    .join(" ")

  const firstValue = chartPoints.find((point) => point.value != null)?.value ?? null
  const latestValue = [...chartPoints].reverse().find((point) => point.value != null)?.value ?? null
  const delta = firstValue != null && latestValue != null ? latestValue - firstValue : null

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="size-4 text-primary" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="mt-1 text-sm font-medium">
              최근 변화:{" "}
              <span className={delta != null && delta >= 0 ? "text-primary" : "text-foreground"}>
                {delta == null
                  ? "기록 부족"
                  : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${METRIC_CONFIG[metric].unit}`}
              </span>
            </p>
          </div>
          <div className="flex gap-1">
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
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted p-3">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Scale className="size-4 text-primary" />
                시작 값
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatMetricValue(firstValue, METRIC_CONFIG[metric].unit)}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Activity className="size-4 text-primary" />
                최근 값
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatMetricValue(latestValue, METRIC_CONFIG[metric].unit)}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-sm text-muted-foreground">최근 측정일</p>
              <p className="mt-2 text-xl font-semibold">
                {[...trend].reverse().find((point) => point.record)?.record?.measuredDate ?? "-"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <svg viewBox="0 0 100 100" className="h-48 w-full overflow-visible">
              <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" className="text-border" />
              {polyline ? (
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-primary"
                  points={polyline}
                />
              ) : null}
              {chartPoints.map((point) => (
                <g key={point.label}>
                  {point.value != null ? (
                    <circle cx={point.x} cy={point.y} r="2.8" className="fill-primary" />
                  ) : null}
                  <text x={point.x} y="98" textAnchor="middle" className="fill-muted-foreground text-[4px]">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
