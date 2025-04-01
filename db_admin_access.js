require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function setupAdminAccess() {
  try {
    console.log('관리자 접근 정책 설정 시작...');
    
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
      // 1. 관리자 역할 변수 설정 함수 생성
      console.log('관리자 설정 함수 생성 중...');
      await client.query(`
        CREATE OR REPLACE FUNCTION set_admin_role(is_admin boolean)
        RETURNS void AS $$
        BEGIN
          PERFORM set_config('app.is_admin', is_admin::text, false);
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // 2. 각 테이블에 관리자 정책 추가
      console.log('image_usage_logs 테이블에 관리자 정책 추가 중...');
      await client.query(`
        DROP POLICY IF EXISTS image_usage_logs_admin_policy ON image_usage_logs;
        CREATE POLICY image_usage_logs_admin_policy ON image_usage_logs
        USING (current_setting('app.is_admin', true)::boolean = true);
      `);
      
      console.log('comments 테이블에 관리자 정책 추가 중...');
      await client.query(`
        DROP POLICY IF EXISTS comments_admin_policy ON comments;
        CREATE POLICY comments_admin_policy ON comments
        USING (current_setting('app.is_admin', true)::boolean = true);
      `);
      
      console.log('likes 테이블에 관리자 정책 추가 중...');
      await client.query(`
        DROP POLICY IF EXISTS likes_admin_policy ON likes;
        CREATE POLICY likes_admin_policy ON likes
        USING (current_setting('app.is_admin', true)::boolean = true);
      `);
      
      console.log('shared_images 테이블에 관리자 정책 추가 중...');
      await client.query(`
        DROP POLICY IF EXISTS shared_images_admin_policy ON shared_images;
        CREATE POLICY shared_images_admin_policy ON shared_images
        USING (current_setting('app.is_admin', true)::boolean = true);
      `);
      
      // 3. 함수 사용법 출력
      console.log('관리자 접근 정책 설정 완료!');
      console.log('\n==== 관리자 권한 사용 방법 ====');
      console.log('1. 관리자 역할 활성화:');
      console.log('   SELECT set_admin_role(true);');
      console.log('2. 데이터 접근 또는 수정 작업 수행');
      console.log('3. 관리자 역할 비활성화:');
      console.log('   SELECT set_admin_role(false);');
      console.log('============================\n');
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
setupAdminAccess(); 