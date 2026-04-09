import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { Profile } from "@/entities/user"

import { ChatBoard } from "./chat-board"

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} alt={props.alt as string} />
  ),
}))

const markReadMock = vi.fn()
const sendMessageMock = vi.fn()
const updateMessageMock = vi.fn()
const deleteMessageMock = vi.fn()

vi.mock("@/features/chat", () => ({
  useChatRooms: () => ({
    data: [
      {
        id: "room-1",
        memberId: "member-1",
        trainerId: "trainer-1",
        counterpartId: "trainer-1",
        counterpartName: "코치 민수",
        counterpartRole: "trainer",
        counterpartAvatarUrl: null,
        lastMessagePreview: "안녕하세요!",
        lastMessageType: "text",
        lastMessageAt: "2026-03-12T10:00:00+09:00",
        unreadCount: 1,
        myLastReadAt: null,
        counterpartLastReadAt: "2026-03-12T10:05:00+09:00",
        createdAt: "2026-03-12T10:00:00+09:00",
        updatedAt: "2026-03-12T10:00:00+09:00",
      },
    ],
    isLoading: false,
  }),
  useChatMessages: () => ({
    data: { pages: [] },
    messages: [
      {
        id: "message-1",
        roomId: "room-1",
        senderId: "trainer-1",
        senderName: "코치 민수",
        senderRole: "trainer",
        senderAvatarUrl: null,
        messageType: "feedback",
        content: "오늘은 스쿼트 자세를 더 천천히 가져가보세요.",
        attachmentPayload: null,
        createdAt: "2026-03-12T10:00:00+09:00",
        updatedAt: "2026-03-12T10:00:00+09:00",
      },
    ],
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
  useSendChatMessage: () => ({
    mutateAsync: sendMessageMock,
    isPending: false,
  }),
  useMarkChatRoomRead: () => ({
    mutate: markReadMock,
    isPending: false,
  }),
  useUpdateChatMessage: () => ({
    mutateAsync: updateMessageMock,
    isPending: false,
  }),
  useDeleteChatMessage: () => ({
    mutateAsync: deleteMessageMock,
    isPending: false,
  }),
  useChatRealtime: () => undefined,
}))

vi.mock("@/features/diet", () => ({
  useMyMeals: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock("@/features/workout", () => ({
  useMyWorkouts: () => ({
    data: [],
    isLoading: false,
  }),
}))

const memberProfile: Profile = {
  id: "member-1",
  role: "member",
  name: "회원 지은",
  email: "member@example.com",
  phone: null,
  avatarUrl: null,
  trainerId: "trainer-1",
  createdAt: "2026-03-12T09:00:00+09:00",
  updatedAt: "2026-03-12T09:00:00+09:00",
  deletedAt: null,
}

describe("ChatBoard", () => {
  beforeEach(() => {
    markReadMock.mockClear()
    sendMessageMock.mockClear()
    updateMessageMock.mockClear()
    deleteMessageMock.mockClear()
    cleanup()
  })

  it("선택된 대화방의 메시지와 읽음 처리를 보여준다", async () => {
    render(<ChatBoard profile={memberProfile} />)

    // useEffect로 첫 번째 방이 선택될 때까지 대기
    await waitFor(() => {
      expect(screen.getAllByText("코치 민수").length).toBeGreaterThan(0)
      expect(screen.getByText("오늘은 스쿼트 자세를 더 천천히 가져가보세요.")).toBeInTheDocument()
      expect(markReadMock).toHaveBeenCalledWith("room-1")
    })
  })

  it("메시지를 입력하고 전송 버튼을 누르면 text 메시지를 전송한다", () => {
    render(<ChatBoard profile={memberProfile} />)

    fireEvent.change(screen.getAllByPlaceholderText("메시지를 입력하세요")[0], {
      target: { value: "오늘 식단도 같이 봐주세요." },
    })
    fireEvent.click(screen.getByRole("button", { name: "전송" }))

    expect(sendMessageMock).toHaveBeenCalledWith({
      roomId: "room-1",
      type: "text",
      content: "오늘 식단도 같이 봐주세요.",
    })
  })
})
