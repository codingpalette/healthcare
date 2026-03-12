-- 식단 기록 테이블
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  calories INTEGER,
  carbs NUMERIC(6,1),
  protein NUMERIC(6,1),
  fat NUMERIC(6,1),
  photo_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON public.meals(date DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, date DESC);

-- RLS 활성화
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- 회원 본인 조회
CREATE POLICY "member_view_own_meals" ON public.meals
  FOR SELECT USING (user_id = auth.uid());

-- 트레이너 전체 조회
CREATE POLICY "trainer_view_all_meals" ON public.meals
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainer'
  );

-- 회원 본인 생성
CREATE POLICY "member_insert_own_meals" ON public.meals
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 회원 본인 수정
CREATE POLICY "member_update_own_meals" ON public.meals
  FOR UPDATE USING (user_id = auth.uid());

-- 회원 본인 삭제
CREATE POLICY "member_delete_own_meals" ON public.meals
  FOR DELETE USING (user_id = auth.uid());
