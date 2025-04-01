require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function setupImageLogsRLS() {
  try {
    console.log('이미지 사용 로그 RLS 정책 설정 시작...');
    
    // PostgreSQL 연결
    const pool = new Pool({
      connectionString: dbConnectionString,
      ssl: { 
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined
      }
    });
    
    console.log('PostgreSQL 연결 중...');
    const client = await pool.connect();
    
    try {
      // 1. image_usage_logs 테이블 RLS 활성화
      console.log('image_usage_logs 테이블 RLS 활성화 중...');
      await client.query(`
        ALTER TABLE image_usage_logs ENABLE ROW LEVEL SECURITY;
      `);
      
      // 2. 읽기 정책 설정 (사용자는 자신의 로그만 조회 가능)
      console.log('image_usage_logs 테이블 읽기 정책 설정 중...');
      await client.query(`
        DROP POLICY IF EXISTS image_usage_logs_select_policy ON image_usage_logs;
        CREATE POLICY image_usage_logs_select_policy ON image_usage_logs
            FOR SELECT
            TO anon
            USING (user_id::text = current_setting('app.current_user_id', true)::text);
      `);
      
      // 3. 삽입 정책 설정 (사용자는 자신의 로그만 생성 가능)
      console.log('image_usage_logs 테이블 삽입 정책 설정 중...');
      await client.query(`
        DROP POLICY IF EXISTS image_usage_logs_insert_policy ON image_usage_logs;
        CREATE POLICY image_usage_logs_insert_policy ON image_usage_logs
            FOR INSERT
            TO anon
            WITH CHECK (user_id::text = current_setting('app.current_user_id', true)::text);
      `);
      
      // 4. 모든 관리자 및 시스템 작업을 위한 별도 정책
      console.log('image_usage_logs 테이블 시스템 정책 설정 중...');
      await client.query(`
        DROP POLICY IF EXISTS image_usage_logs_system_policy ON image_usage_logs;
        CREATE POLICY image_usage_logs_system_policy ON image_usage_logs
            USING (current_setting('app.is_system_operation', true)::boolean = true);
      `);
      
      // 5. 시스템 운영 플래그 설정 함수 생성
      console.log('시스템 운영 플래그 설정 함수 생성 중...');
      await client.query(`
        CREATE OR REPLACE FUNCTION set_system_operation(is_system boolean)
        RETURNS void AS $$
        BEGIN
          PERFORM set_config('app.is_system_operation', is_system::text, false);
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      console.log('이미지 사용 로그 RLS 정책 설정 완료!');
    } catch (error) {
      console.error('SQL 오류:', error);
    } finally {
      client.release();
    }
    
    await pool.end();
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

// 실행
setupImageLogsRLS(); 