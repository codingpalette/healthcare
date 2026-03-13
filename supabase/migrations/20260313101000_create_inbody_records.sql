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
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbody_records_user_id ON public.inbody_records(user_id);
CREATE INDEX IF NOT EXISTS idx_inbody_records_measured_date ON public.inbody_records(measured_date DESC);
CREATE INDEX IF NOT EXISTS idx_inbody_records_user_date ON public.inbody_records(user_id, measured_date DESC);

ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_view_own_inbody_records" ON public.inbody_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trainer_view_all_inbody_records" ON public.inbody_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  );

CREATE POLICY "member_insert_own_inbody_records" ON public.inbody_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_update_own_inbody_records" ON public.inbody_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_delete_own_inbody_records" ON public.inbody_records
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trainer_view_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = trainer_id);

CREATE POLICY "trainer_insert_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "trainer_update_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "trainer_delete_own_inbody_reminder_settings" ON public.inbody_reminder_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = trainer_id);
