-- 센터 기구 사용법 테이블
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('upper', 'lower', 'core', 'cardio', 'etc')),
  description TEXT,
  precautions TEXT,
  youtube_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON public.equipment(name);

-- RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 모두 조회 가능
CREATE POLICY "authenticated_view_equipment" ON public.equipment
  FOR SELECT
  TO authenticated
  USING (true);

-- 트레이너만 등록 가능
CREATE POLICY "trainer_insert_equipment" ON public.equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  );

-- 트레이너만 수정 가능
CREATE POLICY "trainer_update_equipment" ON public.equipment
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  );

-- 트레이너만 삭제 가능
CREATE POLICY "trainer_delete_equipment" ON public.equipment
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'trainer'
    )
  );
