CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serving_size NUMERIC(8, 2) NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC(8, 2),
  carbs NUMERIC(8, 2),
  protein NUMERIC(8, 2),
  fat NUMERIC(8, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items(name);
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 모두 조회
CREATE POLICY "authenticated_view_food_items" ON public.food_items
  FOR SELECT TO authenticated USING (true);

-- 트레이너만 CUD
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
