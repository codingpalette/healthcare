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
      'system'
    )
  );

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feedback_enabled BOOLEAN NOT NULL DEFAULT TRUE;
