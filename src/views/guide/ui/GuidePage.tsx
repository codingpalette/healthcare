"use client"

import type { Profile } from "@/entities/user"
import { ExerciseGuidePage } from "@/views/exercise-guide"

interface GuidePageProps {
  profile: Profile
}

export function GuidePage({ profile }: GuidePageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">운동 DB</h2>
        <p className="text-muted-foreground">
          운동 방법과 주의사항을 확인하세요.
        </p>
      </div>

      <ExerciseGuidePage profile={profile} />
    </div>
  )
}
