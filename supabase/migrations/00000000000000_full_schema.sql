-- ============================================================================
-- WestGym 전체 DB 스키마 (새 Supabase 프로젝트용 통합 마이그레이션)
-- 25개 마이그레이션 파일의 최종 상태를 단일 파일로 통합
-- 생성일: 2026-04-10
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. 공통 함수
-- ────────────────────────────────────────────────────────────────────────────

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 채팅 테이블 전용 updated_at 함수 (UTC 기준)
CREATE OR REPLACE FUNCTION public.set_chat_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. profiles (사용자 프로필)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'trainer', 'admin')),
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_trainer_id ON public.profiles(trainer_id);

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 회원가입 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS 헬퍼 함수 (무한 재귀 방지)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 관리자 존재 여부 확인 함수
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin' AND deleted_at IS NULL
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_view_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "trainer_view_members" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'trainer'
    AND deleted_at IS NULL
  );

CREATE POLICY "admin_view_all" ON public.profiles
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    AND deleted_at IS NULL
  );

CREATE POLICY "user_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "trainer_soft_delete_member" ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() = 'trainer'
  ) WITH CHECK (role = 'member');

CREATE POLICY "admin_update_all" ON public.profiles
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. attendance (출석)
-- ────────────────────────────────────────────────────────────────────────────

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

CREATE POLICY "member_view_own_attendance" ON public.attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "trainer_view_all_attendance" ON public.attendance
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainer'
  );

CREATE POLICY "member_insert_own_attendance" ON public.attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_update_own_attendance" ON public.attendance
  FOR UPDATE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 3. meals (식단)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  calories INTEGER,
  carbs NUMERIC(6,1),
  protein NUMERIC(6,1),
  fat NUMERIC(6,1),
  fiber NUMERIC(6,1),
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  trainer_feedback TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON public.meals(date DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, date DESC);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_view_own_meals" ON public.meals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "trainer_view_all_meals" ON public.meals
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainer'
  );

CREATE POLICY "member_insert_own_meals" ON public.meals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_update_own_meals" ON public.meals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "member_delete_own_meals" ON public.meals
  FOR DELETE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 4. workouts (운동)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight NUMERIC(6, 2),
  duration_minutes INTEGER,
  calories_burned INTEGER,
  notes TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  trainer_feedback TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, date DESC);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_view_own_workouts" ON public.workouts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trainer_view_all_workouts" ON public.workouts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  );

CREATE POLICY "member_insert_own_workouts" ON public.workouts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_update_own_workouts" ON public.workouts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_delete_own_workouts" ON public.workouts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. chat_rooms / chat_messages (1:1 관리톡)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_last_read_at TIMESTAMPTZ NULL,
  trainer_last_read_at TIMESTAMPTZ NULL,
  last_message_at TIMESTAMPTZ NULL,
  last_message_preview TEXT NULL,
  last_message_type TEXT NULL
    CHECK (last_message_type IN ('text', 'feedback', 'meal_share', 'workout_share')),
  last_message_sender_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (member_id, trainer_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'feedback', 'meal_share', 'workout_share')),
  content TEXT NULL,
  attachment_payload JSONB NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS chat_rooms_member_id_idx ON public.chat_rooms(member_id);
CREATE INDEX IF NOT EXISTS chat_rooms_trainer_id_idx ON public.chat_rooms(trainer_id);
CREATE INDEX IF NOT EXISTS chat_rooms_last_message_at_idx ON public.chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_room_id_created_at_idx ON public.chat_messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages(sender_id);

-- 트리거
CREATE TRIGGER set_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_updated_at();

CREATE TRIGGER set_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_updated_at();

-- RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_rooms_select_participants" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = trainer_id);

CREATE POLICY "chat_rooms_insert_participants" ON public.chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id OR auth.uid() = trainer_id);

CREATE POLICY "chat_rooms_update_participants" ON public.chat_rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = member_id OR auth.uid() = trainer_id);

CREATE POLICY "chat_messages_select_participants" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms rooms
      WHERE rooms.id = room_id
        AND (rooms.member_id = auth.uid() OR rooms.trainer_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_insert_sender" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms rooms
      WHERE rooms.id = room_id
        AND (rooms.member_id = auth.uid() OR rooms.trainer_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_update_sender" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms rooms
      WHERE rooms.id = room_id
        AND (rooms.member_id = auth.uid() OR rooms.trainer_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms rooms
      WHERE rooms.id = room_id
        AND (rooms.member_id = auth.uid() OR rooms.trainer_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_delete_sender" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms rooms
      WHERE rooms.id = room_id
        AND (rooms.member_id = auth.uid() OR rooms.trainer_id = auth.uid())
    )
  );

-- Realtime 설정
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'chat_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. inbody_records / inbody_reminder_settings (인바디)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inbody_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  measured_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5, 2),
  skeletal_muscle_mass NUMERIC(5, 2),
  body_fat_percentage NUMERIC(5, 2),
  body_mass_index NUMERIC(5, 2),
  body_fat_mass NUMERIC(5, 2),
  memo TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbody_records_user_id ON public.inbody_records(user_id);
CREATE INDEX IF NOT EXISTS idx_inbody_records_measured_date ON public.inbody_records(measured_date DESC);
CREATE INDEX IF NOT EXISTS idx_inbody_records_user_date ON public.inbody_records(user_id, measured_date DESC);

ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_view_own_inbody_records" ON public.inbody_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trainer_view_all_inbody_records" ON public.inbody_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainer')
  );

CREATE POLICY "admin_view_inbody_records" ON public.inbody_records
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "member_insert_own_inbody_records" ON public.inbody_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_update_own_inbody_records" ON public.inbody_records
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_delete_own_inbody_records" ON public.inbody_records
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 인바디 알림 설정
CREATE TABLE IF NOT EXISTS public.inbody_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  measurement_day INTEGER NOT NULL CHECK (measurement_day BETWEEN 1 AND 28),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbody_reminder_settings_trainer_id
  ON public.inbody_reminder_settings(trainer_id);

ALTER TABLE public.inbody_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_view_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trainer_view_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

CREATE POLICY "trainer_insert_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "trainer_update_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "trainer_delete_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR DELETE TO authenticated
  USING (auth.uid() = trainer_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. notifications / notification_preferences / push_subscriptions (알림)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'inbody_reminder', 'attendance_absence', 'chat_message',
    'meal_feedback', 'workout_feedback', 'membership_expiry',
    'notice', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL UNIQUE,
  scheduled_for TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at
  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_at
  ON public.notifications(recipient_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "user_update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "admin_view_notifications" ON public.notifications
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_update_notifications" ON public.notifications
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- 알림 설정
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  inbody_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  feedback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  membership_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notice_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_own_notification_preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_insert_own_notification_preferences" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_notification_preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 푸시 구독
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_own_push_subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_insert_own_push_subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_push_subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_delete_own_push_subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. user_devices (기기 관리)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON public.user_devices(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON public.user_devices(last_active_at);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_devices" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_devices" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "trainers_view_member_devices" ON public.user_devices
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE trainer_id = auth.uid())
  );

CREATE POLICY "trainers_delete_member_devices" ON public.user_devices
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.profiles WHERE trainer_id = auth.uid())
  );

-- 30일 이상 비활성 기기 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_inactive_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_devices
  WHERE last_active_at < now() - interval '30 days';
END;
$$;

-- pg_cron이 활성화되어 있으면 매일 자정에 실행
-- Supabase 대시보드에서 pg_cron 확장을 활성화한 뒤 아래 주석을 해제
-- SELECT cron.schedule(
--   'cleanup-inactive-devices',
--   '0 0 * * *',
--   'SELECT cleanup_inactive_devices()'
-- );

-- ────────────────────────────────────────────────────────────────────────────
-- 9. memberships (회원권)
-- ────────────────────────────────────────────────────────────────────────────

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

-- 트레이너: 자기 회원 대상 CRUD
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

-- 회원: 자기 회원권 조회만
CREATE POLICY "member_select_own_membership" ON public.memberships
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- 관리자: 모든 회원권 CRUD
CREATE POLICY "admin_select_memberships" ON public.memberships
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_insert_memberships" ON public.memberships
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "admin_update_memberships" ON public.memberships
  FOR UPDATE USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_delete_memberships" ON public.memberships
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- 10. notices (공지사항)
-- ────────────────────────────────────────────────────────────────────────────

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

CREATE TRIGGER on_notices_updated
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_notices" ON public.notices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trainer_insert_notices" ON public.notices
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "trainer_update_notices" ON public.notices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "trainer_delete_notices" ON public.notices
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 11. food_items (음식 DB)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serving_size NUMERIC(8, 2) NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC(8, 2),
  carbs NUMERIC(8, 2),
  protein NUMERIC(8, 2),
  fat NUMERIC(8, 2),
  fiber NUMERIC(8, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items(name);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_food_items" ON public.food_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trainer_insert_food_items" ON public.food_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainer'));

CREATE POLICY "trainer_update_food_items" ON public.food_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainer'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainer'));

CREATE POLICY "trainer_delete_food_items" ON public.food_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainer'));

-- ────────────────────────────────────────────────────────────────────────────
-- 12. exercise_items (운동 항목 DB)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exercise_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('upper', 'lower', 'core', 'cardio', 'etc')),
  description TEXT,
  precautions TEXT,
  youtube_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_items_category ON public.exercise_items(category);
CREATE INDEX IF NOT EXISTS idx_exercise_items_name ON public.exercise_items(name);

ALTER TABLE public.exercise_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_exercise_items" ON public.exercise_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trainer_insert_exercise_items" ON public.exercise_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "trainer_update_exercise_items" ON public.exercise_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "trainer_delete_exercise_items" ON public.exercise_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 13. community_members / community_messages (커뮤니티 채팅)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  left_at TIMESTAMPTZ NULL,
  CONSTRAINT community_members_nickname_length
    CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 20)
);

-- 활성 멤버에 대해서만 user_id 유니크 (퇴장 후 재입장 허용)
CREATE UNIQUE INDEX IF NOT EXISTS community_members_active_user_idx
  ON public.community_members(user_id) WHERE left_at IS NULL;

-- 활성 멤버에 대해서만 닉네임 유니크
CREATE UNIQUE INDEX IF NOT EXISTS community_members_active_nickname_idx
  ON public.community_members(nickname) WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.community_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS community_members_user_id_idx ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS community_members_left_at_idx ON public.community_members(left_at);
CREATE INDEX IF NOT EXISTS community_messages_member_id_idx ON public.community_messages(member_id);
CREATE INDEX IF NOT EXISTS community_messages_created_at_idx ON public.community_messages(created_at DESC);

-- RLS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_members_select_active" ON public.community_members
  FOR SELECT TO authenticated USING (left_at IS NULL);

CREATE POLICY "community_members_insert_own" ON public.community_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_members_update_own" ON public.community_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_messages_select_active_members" ON public.community_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members members
      WHERE members.user_id = auth.uid() AND members.left_at IS NULL
    )
  );

CREATE POLICY "community_messages_insert_active_members" ON public.community_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members members
      WHERE members.id = member_id
        AND members.user_id = auth.uid()
        AND members.left_at IS NULL
    )
  );

-- Realtime 설정
ALTER TABLE public.community_members REPLICA IDENTITY FULL;
ALTER TABLE public.community_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'community_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'community_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
  END IF;
END $$;

-- ============================================================================
-- 끝. 새 Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 실행하세요.
-- ============================================================================
