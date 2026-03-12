CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_at ON public.attendance(check_in_at DESC);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 회원 본인 조회
CREATE POLICY "member_view_own_attendance" ON public.attendance
  FOR SELECT USING (user_id = auth.uid());

-- 트레이너 전체 조회
CREATE POLICY "trainer_view_all_attendance" ON public.attendance
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainer'
  );

-- 회원 본인 체크인 INSERT
CREATE POLICY "member_insert_own_attendance" ON public.attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 회원 본인 체크아웃 UPDATE
CREATE POLICY "member_update_own_attendance" ON public.attendance
  FOR UPDATE USING (user_id = auth.uid());
