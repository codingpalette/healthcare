CREATE TABLE IF NOT EXISTS public.exercise_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('upper', 'lower', 'core', 'cardio', 'etc')),
  description TEXT,
  precautions TEXT,
  youtube_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_items_category ON public.exercise_items(category);
CREATE INDEX IF NOT EXISTS idx_exercise_items_name ON public.exercise_items(name);

ALTER TABLE public.exercise_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "인증된 사용자는 운동 항목을 조회할 수 있다"
  ON public.exercise_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "트레이너만 운동 항목을 추가할 수 있다"
  ON public.exercise_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "트레이너만 운동 항목을 수정할 수 있다"
  ON public.exercise_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "트레이너만 운동 항목을 삭제할 수 있다"
  ON public.exercise_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );
