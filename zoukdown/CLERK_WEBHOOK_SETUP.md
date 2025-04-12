# Clerk Webhook 설정 가이드

이 문서는 Clerk에서 Supabase로 사용자 데이터를 자동으로 동기화하기 위한 Webhook 설정 방법을 안내합니다.

## 1. 필요한 패키지 설치

다음 명령어로 필요한 패키지를 설치합니다:

```bash
npm install svix uuid
```

## 2. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가합니다:

```
CLERK_WEBHOOK_SECRET=your_webhook_secret_from_clerk
```

> 참고: 이미 `CLERK_SECRET_KEY`가 설정되어 있다면, 해당 키도 fallback으로 사용됩니다.

## 3. Clerk 대시보드 설정

1. [Clerk 대시보드](https://dashboard.clerk.dev)에 로그인합니다.
2. 프로젝트를 선택하고, 왼쪽 메뉴에서 "Webhooks"를 클릭합니다.
3. "Add Endpoint" 버튼을 클릭하여 새 Webhook 엔드포인트를 추가합니다.
4. 다음 정보를 입력합니다:
   - URL: `https://your-domain.com/api/clerk-webhook` (실제 도메인으로 변경)
   - 이벤트: 다음 이벤트를 선택합니다:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created` (선택사항)
   - 메시지 필터링: 필요한 경우 설정합니다.
5. "Create" 버튼을 클릭하여 Webhook을 생성합니다.
6. 생성된 Webhook의 "Signing Secret"을 복사하여 `.env.local` 파일의 `CLERK_WEBHOOK_SECRET` 값으로 설정합니다.

## 4. Supabase 스키마 확인

Supabase 데이터베이스에 다음 필드가 있는지 확인합니다:

1. `users` 테이블에 `clerk_id` 필드 (VARCHAR 또는 TEXT 타입)
2. `users` 테이블에 `is_deleted` 필드 (BOOLEAN 타입, 기본값 false)

필요한 경우 다음 SQL을 실행하여 필드를 추가합니다:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS clerk_id TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## 5. 테스트 및 검증

1. Webhook이 올바르게 작동하는지 확인하려면, Clerk 대시보드에서 "Test" 버튼을 클릭하여 테스트 이벤트를 보냅니다.
2. 애플리케이션 로그를 확인하여 Webhook이 올바르게 처리되는지 확인합니다.
3. Supabase에서 사용자 데이터가 올바르게 생성/업데이트되는지 확인합니다.

## 6. 문제 해결

- **404 오류**: URL이 올바른지 확인합니다.
- **401 오류**: Webhook 시크릿이 올바른지 확인합니다.
- **500 오류**: 서버 로그를 확인하여 오류 메시지를 확인합니다.

## 7. 로깅 및 모니터링

Webhook 처리 중 발생하는 모든 이벤트는 서버 로그에 기록됩니다. 추가적인 로깅이 필요한 경우, Supabase에 로그 테이블을 생성하고 logEvent 함수를 수정하여 데이터베이스에 로그를 저장할 수 있습니다:

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
``` 