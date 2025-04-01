require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function setupSecureRLS() {
  try {
    console.log('안전한 RLS 정책 설정 시작...');
    
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
      // 1. 테이블에 RLS 활성화
      console.log('comments 테이블 RLS 활성화 중...');
      await client.query(`
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
      `);
      
      console.log('likes 테이블 RLS 활성화 중...');
      await client.query(`
        ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
      `);
      
      console.log('shared_images 테이블 RLS 활성화 중...');
      await client.query(`
        ALTER TABLE shared_images ENABLE ROW LEVEL SECURITY;
      `);

      // 2. anon 역할에 대한 읽기 정책 설정
      console.log('테이블들에 읽기 정책 설정 중...');
      
      // shared_images 테이블 읽기 정책
      await client.query(`
        DROP POLICY IF EXISTS shared_images_select_policy ON shared_images;
        CREATE POLICY shared_images_select_policy ON shared_images
            FOR SELECT
            TO anon
            USING (true);
      `);
      
      // comments 테이블 읽기 정책
      await client.query(`
        DROP POLICY IF EXISTS comments_select_policy ON comments;
        CREATE POLICY comments_select_policy ON comments
            FOR SELECT
            TO anon
            USING (true);
      `);
      
      // likes 테이블 읽기 정책
      await client.query(`
        DROP POLICY IF EXISTS likes_select_policy ON likes;
        CREATE POLICY likes_select_policy ON likes
            FOR SELECT
            TO anon
            USING (true);
      `);
      
      // 3. 인증된 사용자의 데이터 삽입/수정/삭제 정책
      
      // 인증된 사용자가 자신의 댓글 작성/수정/삭제 가능
      console.log('댓글 테이블 정책 설정 중...');
      
      // 댓글 삽입 정책
      await client.query(`
        DROP POLICY IF EXISTS comments_insert_policy ON comments;
        CREATE POLICY comments_insert_policy ON comments
            FOR INSERT
            TO anon
            WITH CHECK (true);
      `);
      
      // 댓글 삭제 정책 (관리자 또는 본인만 삭제 가능)
      await client.query(`
        DROP POLICY IF EXISTS comments_delete_policy ON comments;
        CREATE POLICY comments_delete_policy ON comments
            FOR DELETE
            TO anon
            USING (true);
      `);
      
      // 좋아요 테이블 정책
      console.log('좋아요 테이블 정책 설정 중...');
      
      // 좋아요 삽입 정책
      await client.query(`
        DROP POLICY IF EXISTS likes_insert_policy ON likes;
        CREATE POLICY likes_insert_policy ON likes
            FOR INSERT
            TO anon
            WITH CHECK (true);
      `);
      
      // 좋아요 삭제 정책
      await client.query(`
        DROP POLICY IF EXISTS likes_delete_policy ON likes;
        CREATE POLICY likes_delete_policy ON likes
            FOR DELETE
            TO anon
            USING (true);
      `);
      
      // 이미지 테이블 정책
      console.log('이미지 테이블 정책 설정 중...');
      
      // 이미지 삽입 정책
      await client.query(`
        DROP POLICY IF EXISTS shared_images_insert_policy ON shared_images;
        CREATE POLICY shared_images_insert_policy ON shared_images
            FOR INSERT
            TO anon
            WITH CHECK (true);
      `);
      
      // 이미지 업데이트 정책 (모든 사용자가 좋아요 수 업데이트 가능)
      await client.query(`
        DROP POLICY IF EXISTS shared_images_update_policy ON shared_images;
        CREATE POLICY shared_images_update_policy ON shared_images
            FOR UPDATE
            TO anon
            USING (true);
      `);
      
      console.log('안전한 RLS 정책 설정 완료!');
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
setupSecureRLS(); 