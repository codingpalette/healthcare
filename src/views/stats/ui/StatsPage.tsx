"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui"
import { DailyAccessChart, AttendanceStats, MemberStatsWidget, DietStatsWidget, WorkoutStatsWidget, InbodyStatsWidget } from "@/widgets/stats"

const TABS = [
  { value: "access", label: "접속" },
  { value: "attendance", label: "출석" },
  { value: "members", label: "회원" },
  { value: "diet", label: "식단" },
  { value: "workout", label: "운동" },
  { value: "inbody", label: "인바디" },
] as const

export function StatsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get("tab") ?? "access"

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">통계</h2>
        <p className="text-muted-foreground">
          센터 운영 현황을 한눈에 확인하세요.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="access" className="mt-6">
          <DailyAccessChart />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceStats />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MemberStatsWidget />
        </TabsContent>

        <TabsContent value="diet" className="mt-6">
          <DietStatsWidget />
        </TabsContent>

        <TabsContent value="workout" className="mt-6">
          <WorkoutStatsWidget />
        </TabsContent>

        <TabsContent value="inbody" className="mt-6">
          <InbodyStatsWidget />
        </TabsContent>
      </Tabs>
    </div>
  )
}
