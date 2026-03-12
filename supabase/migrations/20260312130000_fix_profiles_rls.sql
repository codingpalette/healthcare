-- RLS 서브쿼리에서 무한 재귀 방지를 위한 헬퍼 함수
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "trainer_view_members" ON public.profiles;
CREATE POLICY "trainer_view_members" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'trainer'
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "trainer_soft_delete_member" ON public.profiles;
CREATE POLICY "trainer_soft_delete_member" ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() = 'trainer'
  ) WITH CHECK (role = 'member');
