-- users
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email varchar(255) unique not null,
  created_at timestamp default now()
);

-- generations
create table if not exists generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  user_name varchar(255),
  image_url text not null,
  prompt text,
  aspect_ratio varchar(10),
  rendering_style varchar(20),
  gender varchar(10),
  age varchar(10),
  background varchar(20),
  skin_type varchar(10),
  eye_color varchar(10),
  hair_style varchar(30),
  is_shared boolean default false,
  created_at timestamp default now()
);

-- community_posts
create table if not exists community_posts (
  id uuid primary key default uuid_generate_v4(),
  generation_id uuid references generations(id),
  user_id uuid references users(id),
  content text,
  created_at timestamp default now()
);

-- comments
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references community_posts(id),
  user_id uuid references users(id),
  content text not null,
  created_at timestamp default now()
);

-- likes
create table if not exists likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  generation_id uuid references generations(id),
  created_at timestamp default now()
);

-- plans
create table if not exists plans (
  id uuid primary key default uuid_generate_v4(),
  name varchar(20),
  price_usd numeric,
  billing_cycle varchar(20)
);

-- user_subscriptions
create table if not exists user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  plan_id uuid references plans(id),
  started_at timestamp default now(),
  expires_at timestamp,
  is_active boolean default true
);

-- 기본 plans 데이터 삽입 (이미 있으면 무시하기 위한 처리)
INSERT INTO plans (name, price_usd, billing_cycle)
SELECT 'starter', 0, 'free'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'starter');

INSERT INTO plans (name, price_usd, billing_cycle)
SELECT 'pro_monthly', 9, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'pro_monthly');

INSERT INTO plans (name, price_usd, billing_cycle)
SELECT 'pro_yearly', 7, 'yearly'
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'pro_yearly');

-- uuid-ossp 확장 활성화 (uuid_generate_v4 함수를 사용하기 위함)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 