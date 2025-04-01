-- ✅ A.sql – 통합된 스키마 정의 (shared_comments, shared_likes 제거)

-- 🧑 유저 테이블: Clerk 유저 연동
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT,
  username TEXT,
  profile_image TEXT,
  plan TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 🖼 공유된 이미지 카드 테이블 (메인 + 커뮤니티 연동)
CREATE TABLE IF NOT EXISTS shared_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT,
  prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  likes INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]',
  deleted BOOLEAN DEFAULT FALSE,
  show_on_main BOOLEAN DEFAULT TRUE,
  show_on_community BOOLEAN DEFAULT TRUE
);

-- 💬 댓글 테이블 (공유 카드에 연결됨)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES shared_images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ❤️ 좋아요 테이블 (공유 카드에 연결됨)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES shared_images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (image_id, user_id)
);

-- 📦 구독 정보 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('starter', 'pro', 'team')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  auto_renew BOOLEAN DEFAULT TRUE,
  next_renewal_date DATE,
  cancelled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 🧮 이미지 생성 로그 테이블 (생성 제한 체크용)
CREATE TABLE IF NOT EXISTS image_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 🕵️ 최근 검색 이미지 2장 저장 테이블 (마이갤러리용)
CREATE TABLE IF NOT EXISTS recent_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT,
  prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
