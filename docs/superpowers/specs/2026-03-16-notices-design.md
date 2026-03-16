# 공지사항 (/notices) 설계 스펙

## 개요

헬스장 트레이너/관리자가 전체 회원에게 공지사항을 작성·관리하는 기능.
Novel(TipTap 기반) 리치 텍스트 에디터로 작성하며, 이미지는 에디터 내 인라인 삽입(R2 업로드).

## 결정 사항

| 항목 | 결정 |
|------|------|
| 내용 저장 형식 | JSONB (Novel TipTap JSON) |
| 이미지 처리 | 에디터 내 인라인 삽입, R2 업로드 후 URL을 JSON에 포함 |
| 대상 범위 | 전체 공지만 (대상 지정 없음) |
| 카테고리 | general(일반), important(중요), event(이벤트) |
| 권한 | 조회: 모든 인증 사용자 / CUD: 트레이너만 |
| 상세 보기 | 별도 페이지 (`/notices/[id]`) |
| 작성/편집 | Dialog + Novel 에디터 |
| 알림 | 생성 시 `notice` kind로 전체 회원 알림 (벌크 인서트 + 비동기 푸시) |

---

## 1. 데이터베이스

### notices 테이블

```sql
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'important', 'event')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_category ON public.notices(category);
CREATE INDEX IF NOT EXISTS idx_notices_is_pinned ON public.notices(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_author_id ON public.notices(author_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER on_notices_updated
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### RLS 정책

```sql
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 조회
CREATE POLICY "authenticated_view_notices" ON public.notices
  FOR SELECT TO authenticated USING (true);

-- 트레이너만 생성
CREATE POLICY "trainer_insert_notices" ON public.notices
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

-- 트레이너만 수정
CREATE POLICY "trainer_update_notices" ON public.notices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

-- 트레이너만 삭제
CREATE POLICY "trainer_delete_notices" ON public.notices
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );
```

### 알림 연동

`notifications.kind` CHECK 제약에 `'notice'`를 추가하고, `notification_preferences`에 `notice_enabled BOOLEAN NOT NULL DEFAULT TRUE` 컬럼 추가.
프론트엔드 `NotificationKind` 타입에도 `'notice'` 추가 (기존 누락된 `'membership_expiry'`도 함께 동기화).

---

## 2. API 엔드포인트

파일: `src/app/api/routes/notices.ts`

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| GET | `/notices` | 인증 사용자 | 목록 조회 |
| GET | `/notices/:id` | 인증 사용자 | 상세 조회 |
| POST | `/notices` | 트레이너 | 생성 + 전체 알림 발송 |
| PATCH | `/notices/:id` | 트레이너 | 수정 |
| DELETE | `/notices/:id` | 트레이너 | 삭제 |
| POST | `/notices/images` | 트레이너 | 에디터 이미지 R2 업로드 |

### GET /notices 쿼리 파라미터

- `category` — 카테고리 필터 (생략 시 전체)
- `search` — 제목 검색 (ILIKE, 최소 2글자)
- `page` — 페이지 번호 (기본 1)
- `limit` — 페이지당 개수 (기본 20)
- 정렬: `is_pinned DESC, created_at DESC`
- 응답에 `total` (전체 건수) 포함하여 프론트엔드 페이지네이션 지원

### POST /notices 요청 본문

```json
{
  "title": "string",
  "content": {},
  "category": "general | important | event",
  "isPinned": false
}
```

### POST /notices/images

- `multipart/form-data`로 이미지 파일 수신
- 허용 타입: `image/jpeg`, `image/png`, `image/webp`
- 최대 파일 크기: 10MB
- R2에 `notices/` 경로로 업로드
- 응답: `{ "url": "https://..." }`

---

## 3. FSD 레이어 구조

### Entity — `src/entities/notice/`

```
notice/
├── index.ts              # Public API
├── model/
│   ├── types.ts          # Notice, NoticeInput, NoticeCategory
│   └── index.ts
└── api/
    ├── notice-api.ts     # API 클라이언트 함수
    └── index.ts
```

**타입 정의:**

```typescript
export type NoticeCategory = "general" | "important" | "event"

export interface Notice {
  id: string
  title: string
  content: Record<string, unknown>  // TipTap JSON
  category: NoticeCategory
  isPinned: boolean
  authorId: string
  authorName?: string
  createdAt: string
  updatedAt: string
}

export interface NoticeInput {
  title: string
  content: Record<string, unknown>
  category: NoticeCategory
  isPinned: boolean
}
```

**API 함수:** `getNoticeList`, `getNotice`, `createNotice`, `updateNotice`, `deleteNotice`, `uploadNoticeImage`

### Feature — `src/features/notice/`

```
notice/
├── index.ts
└── model/
    ├── use-notice.ts     # React Query hooks
    └── index.ts
```

**Hooks:** `useNoticeList(category?)`, `useNotice(id)`, `useCreateNotice()`, `useUpdateNotice()`, `useDeleteNotice()`, `useUploadNoticeImage()`

### Widget — `src/widgets/notice/`

```
notice/
├── notice-list.tsx       # 목록 위젯
├── notice-form.tsx       # 작성/편집 Dialog
└── notice-detail.tsx     # 상세 보기 컴포넌트
```

### View — `src/views/notices/`

```
notices/
├── index.ts
└── ui/
    ├── NoticesPage.tsx       # 목록 페이지 컨테이너
    └── NoticeDetailPage.tsx  # 상세 페이지 컨테이너
```

### App Routes

```
src/app/(authenticated)/notices/
├── page.tsx              # → NoticesPage
└── [id]/
    └── page.tsx          # → NoticeDetailPage
```

---

## 4. UI 설계

### 목록 페이지 (`/notices`)

- **헤더:** "공지사항" 타이틀 + 트레이너용 "공지 작성" 버튼
- **필터:** 카테고리 탭 (전체 / 일반 / 중요 / 이벤트) + 검색 Input
- **리스트:** Card 기반, 각 항목에:
  - 고정 공지: 핀 아이콘 + 배지
  - 카테고리 배지 (색상 구분: important=red, event=blue, general=gray)
  - 제목 (클릭 시 `/notices/[id]`로 이동)
  - 작성자명, 작성일
- **정렬:** 고정 공지 상단, 이후 최신순

### 작성/편집 Dialog

- **제목:** Input 필드
- **카테고리:** Select (일반/중요/이벤트)
- **고정 여부:** Switch
- **내용:** Novel 리치 텍스트 에디터
  - 지원 서식: 헤딩, 굵기, 기울임, 목록, 링크, 이미지
  - 이미지 삽입 시 `/api/notices/images`로 R2 업로드
- **하단:** 취소 / 저장 버튼

### 상세 페이지 (`/notices/[id]`)

- **상단:** 뒤로가기 버튼, 카테고리 배지, 고정 배지
- **제목:** 크게 표시
- **메타:** 작성자, 작성일
- **본문:** Novel JSON → 읽기 전용 렌더링
- **트레이너:** 수정/삭제 버튼 (수정 클릭 시 Dialog 오픈, 삭제 시 AlertDialog 확인)

---

## 5. 알림 연동

공지사항 생성(POST) 시 서버에서:

1. 공지사항 INSERT 후 즉시 201 응답 반환
2. 백그라운드에서 알림 처리:
   a. 전체 회원(role='member') 중 `notice_enabled=true`인 사용자 조회
   b. 벌크 INSERT로 알림 레코드 일괄 생성 (`INSERT INTO notifications ... SELECT ...` 단일 쿼리)
      - `kind`: `'notice'`
      - `title`: `"새 공지사항"`
      - `message`: 공지 제목
      - `link`: `/notices/{noticeId}`
      - `dedupe_key`: `notice-{noticeId}-{recipientId}`
   c. 푸시 알림 활성화된 회원에게 Web Push 일괄 발송

**참고:** Hono route 등록 시 `src/app/api/[[...route]]/route.ts`에 `app.route("/notices", noticesRoutes)` 추가 필요.

### authorName 조인

GET 엔드포인트에서 `profiles.name`을 `author_id` FK로 조인하여 반환:
```
.select("*, profiles!author_id(name)")
```

---

## 6. 의존성

- **신규 패키지:** `novel` (리치 텍스트 에디터)
- **기존 재사용:** shadcn/ui 컴포넌트, R2 업로드 유틸, notification 시스템, Hono 미들웨어

---

## 7. 범위 외 (향후)

- 공지사항 대상 지정 (특정 회원/그룹)
- 임시저장(draft) 기능
- 조회수 추적
- 댓글/반응 기능
- R2 이미지 정리 (공지 삭제 시 orphan 이미지 제거)
