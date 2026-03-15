-- notifications kind에 membership_expiry 추가
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (
    kind IN (
      'inbody_reminder',
      'attendance_absence',
      'chat_message',
      'meal_feedback',
      'workout_feedback',
      'membership_expiry',
      'system'
    )
  );

-- notification_preferences에 membership_enabled 컬럼 추가
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN NOT NULL DEFAULT TRUE;
