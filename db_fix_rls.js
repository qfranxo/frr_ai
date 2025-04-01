require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function fixRowLevelSecurity() {
  try {
    console.log('Row Level Security 정책 수정 시작...');
    
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
      // 1. comments 테이블 RLS 비활성화
      console.log('comments 테이블 RLS 비활성화 중...');
      await client.query(`
        ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
      `);
      console.log('comments 테이블 RLS 비활성화 완료');
      
      // 2. likes 테이블 RLS 비활성화
      console.log('likes 테이블 RLS 비활성화 중...');
      await client.query(`
        ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
      `);
      console.log('likes 테이블 RLS 비활성화 완료');
      
      // 3. shared_images 테이블 RLS 비활성화
      console.log('shared_images 테이블 RLS 비활성화 중...');
      await client.query(`
        ALTER TABLE shared_images DISABLE ROW LEVEL SECURITY;
      `);
      console.log('shared_images 테이블 RLS 비활성화 완료');
      
      console.log('Row Level Security 정책 수정 완료!');
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
fixRowLevelSecurity(); 