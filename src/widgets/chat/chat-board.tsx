"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCheck,
  Dumbbell,
  MessagesSquare,
  Pencil,
  Search,
  SendHorizontal,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/entities/user"
import type {
  ChatAttachmentPayload,
  ChatMessage,
  SendChatMessageInput,
} from "@/entities/chat"
import {
  useChatMessages,
  useChatRealtime,
  useChatRooms,
  useDeleteChatMessage,
  useMarkChatRoomRead,
  useSendChatMessage,
  useUpdateChatMessage,
} from "@/features/chat"
import { useMyMeals } from "@/features/diet"
import { useMyWorkouts } from "@/features/workout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

function formatLocalDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRoomTime(dateStr: string | null) {
  if (!dateStr) return ""

  const date = new Date(dateStr)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return formatTime(dateStr)

  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  })
}

function formatShareDate(dateStr?: string | null) {
  if (!dateStr) return null

  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function getInitials(name: string) {
  return name.slice(0, 1)
}

function getLast14DaysRange() {
  const to = formatLocalDateValue(new Date())
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 13)

  return {
    from: formatLocalDateValue(fromDate),
    to,
  }
}

function MessageAttachmentCard({
  type,
  payload,
}: {
  type: ChatMessage["messageType"]
  payload: ChatAttachmentPayload | null
}) {
  if (!payload) return null

  const attachmentKind =
    payload.recordType ?? (type === "meal_share" ? "meal" : type === "workout_share" ? "workout" : null)
  const badgeLabel =
    attachmentKind === "meal"
      ? type === "feedback"
        ? "식단 피드백"
        : "식단 인증"
      : attachmentKind === "workout"
        ? type === "feedback"
          ? "운동 피드백"
          : "운동 인증"
        : type === "feedback"
          ? "피드백"
          : "공유 기록"

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border bg-background">
      {payload.mediaUrl ? (
        payload.mediaType === "video" ? (
          <video src={payload.mediaUrl} controls className="aspect-video w-full bg-black object-cover" />
        ) : (
          <Image
            src={payload.mediaUrl}
            alt={payload.title ?? "공유 미리보기"}
            width={720}
            height={540}
            className="aspect-video w-full object-cover"
            unoptimized
          />
        )
      ) : (
        <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
          {attachmentKind === "meal" ? <UtensilsCrossed className="size-5" /> : <Dumbbell className="size-5" />}
        </div>
      )}
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{badgeLabel}</Badge>
          {formatShareDate(payload.date) && (
            <span className="text-xs text-muted-foreground">{formatShareDate(payload.date)}</span>
          )}
        </div>
        <div>
          <p className="font-medium">{payload.title ?? "공유 기록"}</p>
          {payload.summary && <p className="mt-1 text-sm text-muted-foreground">{payload.summary}</p>}
        </div>
        {payload.chips?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {payload.chips.map((chip) => (
              <span key={chip} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isMine,
  counterpartLastReadAt,
  onEdit,
  onDelete,
}: {
  message: ChatMessage
  isMine: boolean
  counterpartLastReadAt: string | null
  onEdit: (message: ChatMessage) => void
  onDelete: (message: ChatMessage) => void
}) {
  const isEdited = message.updatedAt !== message.createdAt
  const isReadableByCounterpart =
    isMine && counterpartLastReadAt
      ? new Date(counterpartLastReadAt).getTime() >= new Date(message.createdAt).getTime()
      : false
  const canEdit = isMine && ["text", "feedback"].includes(message.messageType)
  const isFeedback = message.messageType === "feedback"
  const isShare =
    message.messageType === "meal_share" || message.messageType === "workout_share"
  const hasAttachment = !!message.attachmentPayload

  return (
    <div className={cn("flex gap-3", isMine && "justify-end")}>
      {!isMine && (
        <Avatar className="mt-1 size-9">
          {message.senderAvatarUrl && <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />}
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[78%]", isMine && "items-end text-right")}>
        {!isMine && (
          <p className="mb-1 px-1 text-xs text-muted-foreground">{message.senderName}</p>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm shadow-sm",
            isFeedback || isShare
              ? "border border-primary/15 bg-linear-to-br from-primary/6 via-background to-background text-foreground"
              : isMine
                ? "bg-primary text-primary-foreground"
                : "bg-card text-card-foreground",
            (isFeedback || isShare) && hasAttachment && "px-3 py-3"
          )}
        >
          {isFeedback && (
            <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/10">
              트레이너 피드백
            </Badge>
          )}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          {message.attachmentPayload && (
            <MessageAttachmentCard type={message.messageType} payload={message.attachmentPayload} />
          )}
        </div>
        <div className={cn("mt-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground", isMine && "justify-end")}>
          <span>{formatTime(message.createdAt)}</span>
          {isEdited && <span>수정됨</span>}
          {isMine && (
            <span className="inline-flex items-center gap-1">
              <CheckCheck className="size-3" />
              {isReadableByCounterpart ? "읽음" : "전송됨"}
            </span>
          )}
        </div>
        {canEdit && (
          <div className={cn("mt-1 flex gap-1 px-1", isMine && "justify-end")}>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(message)} aria-label="메시지 수정">
              <Pencil className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(message)} aria-label="메시지 삭제">
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ShareDialog({
  open,
  onOpenChange,
  kind,
  roomId,
  onShared,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: "meal" | "workout"
  roomId: string
  onShared: () => void
}) {
  const { from, to } = useMemo(() => getLast14DaysRange(), [])
  const { data: meals, isLoading: isMealLoading } = useMyMeals(from, to)
  const { data: workouts, isLoading: isWorkoutLoading } = useMyWorkouts(from, to)
  const sendMessage = useSendChatMessage()

  const items =
    kind === "meal"
      ? (meals ?? []).map((meal) => ({
          id: meal.id,
          title: `${meal.mealType === "breakfast" ? "아침" : meal.mealType === "lunch" ? "점심" : meal.mealType === "dinner" ? "저녁" : "간식"} 식단`,
          description: meal.description ?? "식단 메모 없음",
          mediaUrl: meal.photoUrls[0] ?? null,
          mediaType: null,
          chips: [
            meal.calories != null ? `${meal.calories}kcal` : null,
            meal.carbs != null ? `탄 ${meal.carbs}g` : null,
            meal.protein != null ? `단 ${meal.protein}g` : null,
            meal.fat != null ? `지 ${meal.fat}g` : null,
          ].filter(Boolean) as string[],
          payload: { roomId, type: "meal_share" as const, mealId: meal.id },
        }))
      : (workouts ?? []).map((workout) => ({
          id: workout.id,
          title: workout.exerciseName,
          description: workout.notes ?? "운동일지 없음",
          mediaUrl: workout.mediaUrls[0] ?? null,
          mediaType: null,
          chips: [
            workout.sets != null ? `${workout.sets}세트` : null,
            workout.reps != null ? `${workout.reps}회` : null,
            workout.weight != null ? `${workout.weight}kg` : null,
            workout.durationMinutes != null ? `${workout.durationMinutes}분` : null,
          ].filter(Boolean) as string[],
          payload: { roomId, type: "workout_share" as const, workoutId: workout.id },
        }))

  const isLoading = kind === "meal" ? isMealLoading : isWorkoutLoading

  async function handleShare(input: SendChatMessageInput) {
    try {
      await sendMessage.mutateAsync(input)
      onOpenChange(false)
      onShared()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "공유에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{kind === "meal" ? "식단 인증 공유" : "운동 인증 공유"}</DialogTitle>
          <DialogDescription>
            최근 14일 기록 중 관리톡으로 공유할 항목을 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)
          ) : !items.length ? (
            <p className="rounded-2xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              최근 14일 내 공유할 기록이 없습니다.
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row">
                {item.mediaUrl ? (
                  kind === "workout" && item.mediaType === "video" ? (
                    <video src={item.mediaUrl} controls className="h-36 w-full rounded-xl bg-black object-cover sm:h-24 sm:w-28" />
                  ) : (
                    <Image
                      src={item.mediaUrl}
                      alt={item.title}
                      width={160}
                      height={120}
                      className="h-36 w-full rounded-xl object-cover sm:h-24 sm:w-28"
                      unoptimized
                    />
                  )
                ) : (
                  <div className="flex h-36 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-24 sm:w-28">
                    {kind === "meal" ? <UtensilsCrossed className="size-5" /> : <Dumbbell className="size-5" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.chips.map((chip) => (
                      <span key={chip} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  className="sm:self-center"
                  onClick={() => handleShare(item.payload)}
                  disabled={sendMessage.isPending}
                >
                  공유하기
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ChatBoard({ profile }: { profile: Profile }) {
  const { data: rooms, isLoading: isRoomsLoading } = useChatRooms()
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [draft, setDraft] = useState("")
  const [composerMode, setComposerMode] = useState<"text" | "feedback">("text")
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null)
  const [shareDialog, setShareDialog] = useState<"meal" | "workout" | null>(null)

  const selectedRoom = rooms?.find((room) => room.id === selectedRoomId) ?? null
  const filteredRooms = (rooms ?? []).filter((room) =>
    room.counterpartName.toLowerCase().includes(keyword.toLowerCase())
  )

  useEffect(() => {
    if (!selectedRoomId && rooms?.length) {
      setSelectedRoomId(rooms[0].id)
    }
  }, [rooms, selectedRoomId])

  useEffect(() => {
    if (selectedRoomId && rooms?.every((room) => room.id !== selectedRoomId)) {
      setSelectedRoomId(rooms[0]?.id ?? null)
    }
  }, [rooms, selectedRoomId])

  const { data: messages, isLoading: isMessagesLoading } = useChatMessages(selectedRoomId)
  const sendMessage = useSendChatMessage()
  const {
    mutate: markRoomRead,
    isPending: isMarkingRead,
  } = useMarkChatRoomRead()
  const updateMessage = useUpdateChatMessage()
  const deleteMessage = useDeleteChatMessage()

  useChatRealtime(selectedRoomId)

  useEffect(() => {
    if (selectedRoom?.unreadCount && !isMarkingRead) {
      markRoomRead(selectedRoom.id)
    }
  }, [isMarkingRead, markRoomRead, selectedRoom?.id, selectedRoom?.unreadCount])

  function resetComposer() {
    setDraft("")
    setComposerMode("text")
    setEditingMessage(null)
  }

  async function handleSubmit() {
    if (!selectedRoomId) return

    try {
      if (editingMessage) {
        await updateMessage.mutateAsync({
          messageId: editingMessage.id,
          content: draft,
        })
        toast.success("메시지를 수정했습니다")
      } else {
        await sendMessage.mutateAsync({
          roomId: selectedRoomId,
          type: composerMode,
          content: draft,
        })
      }

      resetComposer()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "메시지 처리에 실패했습니다")
    }
  }

  async function handleDeleteMessage() {
    if (!messageToDelete) return

    try {
      await deleteMessage.mutateAsync(messageToDelete.id)
      toast.success("메시지를 삭제했습니다")
      setMessageToDelete(null)
      if (editingMessage?.id === messageToDelete.id) {
        resetComposer()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "메시지 삭제에 실패했습니다")
    }
  }

  const emptyLabel =
    profile.role === "trainer"
      ? "배정된 회원이 없어 관리톡을 시작할 수 없습니다."
      : "배정된 트레이너가 없어 관리톡을 시작할 수 없습니다."

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border-0 shadow-md">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="이름으로 대화 검색"
                  className="pl-9"
                />
              </div>
            </div>

            {isRoomsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : !filteredRooms.length ? (
              <p className="rounded-2xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
                {rooms?.length ? "검색 결과가 없습니다." : emptyLabel}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-colors",
                      selectedRoomId === room.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        {room.counterpartAvatarUrl && (
                          <AvatarImage src={room.counterpartAvatarUrl} alt={room.counterpartName} />
                        )}
                        <AvatarFallback>{getInitials(room.counterpartName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{room.counterpartName}</p>
                            <p className="text-xs text-muted-foreground">
                              {room.counterpartRole === "trainer" ? "트레이너" : "회원"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{formatRoomTime(room.lastMessageAt)}</p>
                            {room.unreadCount > 0 && (
                              <Badge className="mt-1 bg-primary text-primary-foreground hover:bg-primary">
                                {room.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {room.lastMessagePreview || "대화를 시작해보세요."}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          {!selectedRoom ? (
            <CardContent className="flex min-h-[640px] flex-col items-center justify-center gap-3 pt-6 text-center">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <MessagesSquare className="size-8" />
              </div>
              <div>
                <p className="font-medium">대화를 선택하세요</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rooms?.length ? "왼쪽 목록에서 대화방을 선택하면 메시지를 확인할 수 있습니다." : emptyLabel}
                </p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex min-h-[640px] flex-col pt-6">
              <div className="flex items-center gap-3 border-b pb-4">
                <Avatar className="size-11">
                  {selectedRoom.counterpartAvatarUrl && (
                    <AvatarImage src={selectedRoom.counterpartAvatarUrl} alt={selectedRoom.counterpartName} />
                  )}
                  <AvatarFallback>{getInitials(selectedRoom.counterpartName)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{selectedRoom.counterpartName}</p>
                    <Badge variant="secondary">
                      {selectedRoom.counterpartRole === "trainer" ? "트레이너" : "회원"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile.role === "trainer"
                      ? "운동·식단 인증과 피드백을 관리하는 대화입니다."
                      : "인증 기록을 공유하고 피드백을 주고받는 대화입니다."}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                {isMessagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 w-full" />
                    ))}
                  </div>
                ) : !(messages?.length ?? 0) ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full bg-primary/10 p-4 text-primary">
                      <MessagesSquare className="size-8" />
                    </div>
                    <div>
                      <p className="font-medium">아직 대화가 없습니다</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        첫 메시지를 보내 관리톡을 시작해보세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages?.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isMine={message.senderId === profile.id}
                        counterpartLastReadAt={selectedRoom.counterpartLastReadAt}
                        onEdit={(target) => {
                          setEditingMessage(target)
                          setDraft(target.content ?? "")
                          setComposerMode(target.messageType === "feedback" ? "feedback" : "text")
                        }}
                        onDelete={setMessageToDelete}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {profile.role === "trainer" ? (
                    <Button
                      type="button"
                      variant={composerMode === "feedback" && !editingMessage ? "default" : "outline"}
                      onClick={() => setComposerMode((prev) => (prev === "feedback" ? "text" : "feedback"))}
                    >
                      피드백 메시지
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => setShareDialog("meal")}>
                        <UtensilsCrossed className="size-4" />
                        식단 공유
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShareDialog("workout")}>
                        <Dumbbell className="size-4" />
                        운동 공유
                      </Button>
                    </>
                  )}
                  {editingMessage && (
                    <Badge variant="secondary">
                      메시지 수정 중
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      editingMessage
                        ? "수정할 메시지를 입력하세요"
                        : composerMode === "feedback"
                          ? "회원에게 전달할 피드백을 입력하세요"
                          : "메시지를 입력하세요"
                    }
                    className="min-h-[96px] flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex gap-2 sm:flex-col">
                    {editingMessage && (
                      <Button type="button" variant="outline" onClick={resetComposer}>
                        취소
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={
                        !draft.trim() ||
                        sendMessage.isPending ||
                        updateMessage.isPending
                      }
                    >
                      <SendHorizontal className="size-4" />
                      {editingMessage ? "수정" : "전송"}
                    </Button>
                  </div>
                </div>

                {profile.role === "member" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    식단/운동 공유는 최근 14일 기록만 보입니다. 더 오래된 기록은
                    <Link href="/diet" className="ml-1 underline underline-offset-4">식단</Link>,
                    <Link href="/workout" className="ml-1 underline underline-offset-4">운동</Link>
                    페이지에서 확인하세요.
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {selectedRoomId && shareDialog && (
        <ShareDialog
          open={!!shareDialog}
          onOpenChange={(open) => {
            if (!open) setShareDialog(null)
          }}
          kind={shareDialog}
          roomId={selectedRoomId}
          onShared={() => {
            setShareDialog(null)
            toast.success("관리톡으로 공유했습니다")
          }}
        />
      )}

      <AlertDialog
        open={!!messageToDelete}
        onOpenChange={(open) => {
          if (!open) setMessageToDelete(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>메시지를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 메시지는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteMessage}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
