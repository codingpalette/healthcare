ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_meals_date_reviewed_at
  ON public.meals(date DESC, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_workouts_date_reviewed_at
  ON public.workouts(date DESC, reviewed_at);
