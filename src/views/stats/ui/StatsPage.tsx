"use client"

import { DailyAccessChart } from "@/widgets/stats"

export function StatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">접속 통계</h2>
        <p className="text-muted-foreground">
          일별 접속 현황을 확인하세요.
        </p>
      </div>
      <DailyAccessChart />
    </div>
  )
}
