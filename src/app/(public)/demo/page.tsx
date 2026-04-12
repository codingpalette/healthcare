import Link from "next/link"
import {
  Activity,
  ChevronLeft,
  Dumbbell,
  MessageCircleMore,
  Sparkles,
  TimerReset,
  UtensilsCrossed,
} from "lucide-react"

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

const buttonLinkClass =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-background bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"

const buttonLinkSmClass = "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5"
const buttonLinkLgClass = "h-10 gap-1.5 px-2.5"

const previewItems = [
  {
    icon: TimerReset,
    title: "출석 체크",
    description: "오늘 출석 상태를 보고 체크인/체크아웃할 수 있습니다.",
    points: ["오늘 출석 상태 확인", "주간 출석 히스토리", "운동 시간 자동 정리"],
  },
  {
    icon: UtensilsCrossed,
    title: "식단 기록",
    description: "식단 사진과 영양 정보를 기록하고 피드백을 받을 수 있습니다.",
    points: ["식단 사진 업로드", "영양 정보 기록", "트레이너 확인 상태 표시"],
  },
  {
    icon: Dumbbell,
    title: "운동 인증",
    description: "운동 기록과 인증 미디어를 남기고 루틴을 관리할 수 있습니다.",
    points: ["운동 인증 미디어 등록", "운동 기록 누적 관리", "관리톡 연동 피드백"],
  },
  {
    icon: MessageCircleMore,
    title: "관리톡",
    description: "트레이너와 1:1로 빠르게 피드백을 주고받을 수 있습니다.",
    points: ["1:1 실시간 메시지", "식단/운동 기록 공유", "읽음 처리 지원"],
  },
]

export default function DemoPage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(255,255,255,0.9))]">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-8 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/login"
            className={cn(buttonLinkClass, buttonLinkSmClass)}
          >
            <ChevronLeft className="size-4" />
            로그인으로 돌아가기
          </Link>
          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
            <Sparkles className="size-3.5" />
            회원 기능 체험
          </Badge>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-0 shadow-md">
            <CardHeader className="gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Activity className="size-6" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  로그인 전에 회원 기능을 먼저 둘러보세요
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7">
                  웨스트짐 회원 화면에서 실제로 사용하게 될 출석, 식단, 운동, 관리톡 흐름을
                  미리 확인할 수 있는 소개 페이지입니다.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">빠르게 확인할 수 있는 기능</p>
                  <p className="mt-2 text-2xl font-semibold">4가지</p>
                </div>
                <div className="rounded-2xl bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">주요 사용자 흐름</p>
                  <p className="mt-2 text-2xl font-semibold">출석 · 식단 · 운동</p>
                </div>
                <div className="rounded-2xl bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">피드백 채널</p>
                  <p className="mt-2 text-2xl font-semibold">관리톡</p>
                </div>
              </div>

              <div className="rounded-3xl border bg-background p-5">
                <p className="text-sm font-medium">체험 흐름</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {previewItems.map((item, index) => (
                    <div key={item.title} className="rounded-2xl bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-background text-primary shadow-xs ring-1 ring-border/60">
                          <item.icon className="size-5" />
                        </div>
                        <span className="text-xs text-muted-foreground">0{index + 1}</span>
                      </div>
                      <p className="mt-4 font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>회원 기능 미리보기</CardTitle>
              <CardDescription>
                실제 로그인 후 주로 사용하게 되는 기능들입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {previewItems.map((item) => (
                <div key={item.title} className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.points.map((point) => (
                          <Badge key={point} variant="secondary">
                            {point}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-primary/5 p-4 text-sm text-muted-foreground">
                체험 화면은 공개 소개용이며, 실제 기록 등록과 개인 데이터 조회는 로그인 후 사용할 수 있습니다.
              </div>

              <div className="flex gap-2">
                <Link
                  href="/login"
                  className={cn(
                    buttonLinkClass,
                    buttonLinkLgClass,
                    "flex-1 border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
                  )}
                >
                  로그인하러 가기
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
