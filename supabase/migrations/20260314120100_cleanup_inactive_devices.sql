CREATE OR REPLACE FUNCTION cleanup_inactive_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_devices
  WHERE last_active_at < now() - interval '30 days';
END;
$$;

-- pg_cron이 활성화되어 있으면 매일 자정에 실행
-- Supabase 대시보드에서 pg_cron 확장을 활성화한 뒤 아래 주석을 해제
-- SELECT cron.schedule(
--   'cleanup-inactive-devices',
--   '0 0 * * *',
--   'SELECT cleanup_inactive_devices()'
-- );
