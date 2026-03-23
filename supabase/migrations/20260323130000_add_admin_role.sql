-- 관리자(admin) 역할 추가
-- admin은 모든 회원/트레이너를 관리하고 모든 알림을 받을 수 있는 최상위 역할

-- 1. role CHECK 제약조건 변경: admin 추가
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'trainer', 'admin'));

-- 2. get_my_role() 함수는 이미 role 텍스트를 반환하므로 변경 불필요

-- 3. 관리자 존재 여부 확인 함수 (setup-admin 페이지에서 사용)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin' AND deleted_at IS NULL
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. RLS 정책: admin은 모든 프로필 조회 가능
CREATE POLICY "admin_view_all" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    AND deleted_at IS NULL
  );

-- 5. RLS 정책: admin은 모든 프로필 수정 가능
CREATE POLICY "admin_update_all" ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
  );

-- 6. RLS 정책: admin은 모든 회원권 조회/관리 가능
CREATE POLICY "admin_select_memberships" ON public.memberships
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_insert_memberships" ON public.memberships
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin_update_memberships" ON public.memberships
  FOR UPDATE USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_delete_memberships" ON public.memberships
  FOR DELETE USING (public.get_my_role() = 'admin');

-- 7. RLS 정책: admin은 모든 인바디 기록 조회 가능
CREATE POLICY "admin_view_inbody_records" ON public.inbody_records
  FOR SELECT USING (public.get_my_role() = 'admin');

-- 8. RLS 정책: admin은 모든 알림 조회 가능
CREATE POLICY "admin_view_notifications" ON public.notifications
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_update_notifications" ON public.notifications
  FOR UPDATE USING (public.get_my_role() = 'admin');
