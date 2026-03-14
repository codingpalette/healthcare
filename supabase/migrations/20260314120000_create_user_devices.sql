-- 기기 관리 테이블
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active_at);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_devices" ON user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_devices" ON user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_devices" ON user_devices
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "trainers_view_member_devices" ON user_devices
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE trainer_id = auth.uid())
  );

CREATE POLICY "trainers_delete_member_devices" ON user_devices
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE trainer_id = auth.uid())
  );
