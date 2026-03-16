"use client"

import { useEffect, useRef, useState } from "react"
import { Send, LogOut } from "lucide-react"
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Badge,
  Skeleton,
} from "@/shared/ui"
import {
  useCommunityStatus,
  useCommunityMessages,
  useJoinCommunity,
  useLeaveCommunity,
  useSendCommunityMessage,
  useCommunityRealtime,
} from "@/features/community"
import { cn } from "@/shared/lib/utils"

interface CommunityBoardProps {
  userId: string
}

// 날짜 구분선 라벨 포맷
function formatDateLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

// 날짜 키 (YYYY-MM-DD)
function getDateKey(createdAt: string): string {
  return new Date(createdAt).toISOString().slice(0, 10)
}

// 시간 포맷 (HH:MM)
function formatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 실시간 구독은 joined 상태에서만 활성화
function RealtimeSubscriber() {
  useCommunityRealtime()
  return null
}

export function CommunityBoard({ userId: _userId }: CommunityBoardProps) {
  const { data: status, isLoading } = useCommunityStatus()
  const isJoined = status?.joined ?? false

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className="flex h-[600px] flex-col">
        <CardHeader className="border-b pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-10 w-5/6" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {isJoined && <RealtimeSubscriber />}
      {isJoined ? (
        <ChatInterface nickname={status?.nickname ?? ""} />
      ) : (
        <JoinForm />
      )}
    </>
  )
}

// 입장 폼
function JoinForm() {
  const [nickname, setNickname] = useState("")
  const joinMutation = useJoinCommunity()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (trimmed.length < 2 || trimmed.length > 20) return
    joinMutation.mutate(trimmed)
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>커뮤니티 채팅</CardTitle>
        <CardDescription>익명 닉네임으로 참여하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2-20자 입력"
              minLength={2}
              maxLength={20}
              required
            />
          </div>
          {joinMutation.isError && (
            <p className="text-destructive text-sm">
              {joinMutation.error instanceof Error
                ? joinMutation.error.message
                : "입장에 실패했습니다. 다시 시도해주세요."}
            </p>
          )}
          <Button type="submit" disabled={joinMutation.isPending} className="w-full">
            {joinMutation.isPending ? "입장 중..." : "입장하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// 채팅 인터페이스
function ChatInterface({ nickname }: { nickname: string }) {
  const { messages } = useCommunityMessages()
  const leaveMutation = useLeaveCommunity()
  const sendMutation = useSendCommunityMessage()
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleLeave = () => {
    if (window.confirm("커뮤니티 채팅에서 퇴장하시겠습니까?")) {
      leaveMutation.mutate()
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || sendMutation.isPending) return
    sendMutation.mutate(trimmed, {
      onSuccess: () => setInputValue(""),
    })
  }

  // 날짜 구분선과 메시지를 함께 렌더링하기 위한 구성
  const renderedItems = buildRenderItems(messages)

  return (
    <Card className="flex h-[600px] flex-col">
      {/* 헤더 */}
      <CardHeader className="flex flex-row items-center justify-between border-b py-3">
        <span className="text-base font-semibold">커뮤니티 채팅</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{nickname}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            disabled={leaveMutation.isPending}
          >
            <LogOut className="mr-1 h-3.5 w-3.5" />
            퇴장하기
          </Button>
        </div>
      </CardHeader>

      {/* 메시지 목록 */}
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
          {renderedItems.length === 0 && (
            <p className="text-muted-foreground mx-auto mt-8 text-sm">
              첫 번째 메시지를 보내보세요!
            </p>
          )}
          {renderedItems.map((item) => {
            if (item.type === "date-separator") {
              return (
                <div
                  key={`date-${item.dateKey}`}
                  className="my-2 flex items-center justify-center"
                >
                  <span className="bg-muted text-muted-foreground rounded-full px-3 py-0.5 text-xs">
                    {item.label}
                  </span>
                </div>
              )
            }

            const { message, showNickname } = item
            const isOwn = message.isMine
            return (
              <div
                key={message.id}
                className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}
              >
                {showNickname && !isOwn && (
                  <span className="text-muted-foreground mb-0.5 ml-1 text-xs font-bold">
                    {message.nickname}
                  </span>
                )}
                <div className="flex items-end gap-1.5">
                  {isOwn && (
                    <span className="text-muted-foreground mb-0.5 text-[10px]">
                      {formatTime(message.createdAt)}
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                  {!isOwn && (
                    <span className="text-muted-foreground mb-0.5 text-[10px]">
                      {formatTime(message.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 메시지 입력 */}
        <form onSubmit={handleSend} className="flex gap-2 border-t px-4 py-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="메시지를 입력하세요"
            className="flex-1"
            disabled={sendMutation.isPending}
          />
          <Button type="submit" size="icon" disabled={sendMutation.isPending || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// 렌더링 아이템 타입
type DateSeparatorItem = {
  type: "date-separator"
  dateKey: string
  label: string
}

type MessageItem = {
  type: "message"
  message: {
    id: string
    memberId: string
    nickname: string
    content: string
    createdAt: string
    isMine: boolean
  }
  showNickname: boolean
}

type RenderItem = DateSeparatorItem | MessageItem

function buildRenderItems(
  messages: Array<{
    id: string
    memberId: string
    nickname: string
    content: string
    createdAt: string
    isMine: boolean
  }>
): RenderItem[] {
  const items: RenderItem[] = []
  let lastDateKey = ""
  let lastMemberId = ""

  for (const message of messages) {
    const dateKey = getDateKey(message.createdAt)

    // 날짜 구분선
    if (dateKey !== lastDateKey) {
      items.push({
        type: "date-separator",
        dateKey,
        label: formatDateLabel(message.createdAt),
      })
      lastDateKey = dateKey
      lastMemberId = "" // 날짜 바뀌면 닉네임 다시 표시
    }

    const showNickname = message.memberId !== lastMemberId
    lastMemberId = message.memberId

    items.push({
      type: "message",
      message,
      showNickname,
    })
  }

  return items
}
