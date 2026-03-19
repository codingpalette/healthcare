-- food_items 테이블에 fiber 컬럼 추가
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS fiber NUMERIC(8, 2);

-- meals 테이블에 fiber 컬럼 추가
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS fiber NUMERIC(6, 1);
