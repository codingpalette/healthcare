-- equipment 데이터를 exercise_items로 이전 후 equipment 테이블 삭제

-- 기존 equipment 데이터를 exercise_items로 복사 (중복 이름 제외)
INSERT INTO public.exercise_items (name, category, description, precautions, youtube_url, image_urls, created_at, updated_at)
SELECT name, category, description, precautions, youtube_url, image_urls, created_at, updated_at
FROM public.equipment
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_items ei WHERE ei.name = equipment.name
);

-- equipment 테이블 삭제
DROP TABLE IF EXISTS public.equipment;
