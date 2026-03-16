-- notices 테이블 생성
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

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notices_category ON public.notices(category);
CREATE INDEX IF NOT EXISTS idx_notices_is_pinned ON public.notices(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_author_id ON public.notices(author_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER on_notices_updated
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS 활성화
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

-- notification kind에 'notice' 추가
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN (
    'inbody_reminder', 'attendance_absence', 'chat_message',
    'meal_feedback', 'workout_feedback', 'system', 'membership_expiry',
    'notice'
  ));

-- notification_preferences에 notice_enabled 컬럼 추가
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notice_enabled BOOLEAN NOT NULL DEFAULT TRUE;
