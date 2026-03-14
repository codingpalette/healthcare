-- 인바디, 식단, 운동 테이블에 다중 이미지 지원 (최대 5장)

-- 1. 배열 컬럼 추가
ALTER TABLE inbody_records ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE meals ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';

-- 2. 기존 단일 URL 데이터 마이그레이션
UPDATE inbody_records SET photo_urls = ARRAY[photo_url] WHERE photo_url IS NOT NULL AND photo_urls = '{}';
UPDATE meals SET photo_urls = ARRAY[photo_url] WHERE photo_url IS NOT NULL AND photo_urls = '{}';
UPDATE workouts SET media_urls = ARRAY[media_url] WHERE media_url IS NOT NULL AND media_urls = '{}';

-- 3. 기존 단일 URL 컬럼 제거
ALTER TABLE inbody_records DROP COLUMN IF EXISTS photo_url;
ALTER TABLE meals DROP COLUMN IF EXISTS photo_url;
ALTER TABLE workouts DROP COLUMN IF EXISTS media_url;
