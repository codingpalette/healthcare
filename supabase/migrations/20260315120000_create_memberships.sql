-- memberships 테이블
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(end_date);

CREATE TRIGGER on_memberships_updated
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- RLS: 트레이너 - 자기 회원 대상 CRUD
CREATE POLICY "trainer_select_memberships" ON public.memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_insert_memberships" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_update_memberships" ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_delete_memberships" ON public.memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

-- RLS: 회원 - 자기 회원권 조회만
CREATE POLICY "member_select_own_membership" ON public.memberships
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());
