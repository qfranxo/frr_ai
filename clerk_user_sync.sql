-- Clerk-Supabase 사용자 동기화를 위한 테이블 수정

-- 1. users 테이블에 clerk_id 및 is_deleted 필드 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS clerk_id TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

-- 3. Webhook 로그 테이블 생성 (선택사항)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL, 
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- 4. updated_at을 자동으로 업데이트하는 트리거 추가
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. 기존 사용자 clerk_id 연결을 위한 헬퍼 함수 (필요시 사용)
CREATE OR REPLACE FUNCTION link_user_to_clerk(user_email TEXT, clerk_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- 이메일로 사용자 찾기
  SELECT id INTO user_id FROM users WHERE email = user_email;
  
  -- 사용자가 존재하면 clerk_id 업데이트
  IF user_id IS NOT NULL THEN
    UPDATE users SET clerk_id = clerk_user_id, updated_at = now() WHERE id = user_id;
    RETURN user_id;
  ELSE
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$ LANGUAGE plpgsql; 