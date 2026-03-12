-- 트레이너-회원 연결을 위한 trainer_id 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_trainer_id ON public.profiles(trainer_id);
