require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function fixDatabaseSchema() {
  try {
    console.log('데이터베이스 스키마 수정 시작...');
    
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
      // 1. shared_images 테이블에 likes 필드 추가 (없는 경우)
      console.log('shared_images 테이블 업데이트 중...');
      const updateImagesTableSQL = `
        ALTER TABLE shared_images 
        ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
      `;
      await client.query(updateImagesTableSQL);
      console.log('shared_images 테이블 업데이트 완료');
      
      // 2. shared_comments 테이블의 content 필드를 text로 변경
      console.log('shared_comments 테이블 구조 확인 중...');
      
      // 필드가 이미 존재하는지 확인
      const checkColumnsSQL = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'shared_comments' 
        AND column_name IN ('content', 'text');
      `;
      const columnResult = await client.query(checkColumnsSQL);
      
      const hasContent = columnResult.rows.some(row => row.column_name === 'content');
      const hasText = columnResult.rows.some(row => row.column_name === 'text');
      
      if (hasContent && !hasText) {
        // content 필드가 있고 text 필드가 없으면 컬럼 이름 변경
        await client.query(`ALTER TABLE shared_comments RENAME COLUMN content TO text;`);
        console.log('content 필드를 text로 변경 완료');
      } else if (!hasContent && !hasText) {
        // 둘 다 없으면 text 필드 추가
        await client.query(`ALTER TABLE shared_comments ADD COLUMN text TEXT;`);
        console.log('text 필드 추가 완료');
      } else {
        console.log('text 필드가 이미 존재함');
      }
      
      // 3. shared_likes 테이블 생성 (없는 경우)
      console.log('shared_likes 테이블 생성 중...');
      const createLikesTableSQL = `
        CREATE TABLE IF NOT EXISTS shared_likes (
          id SERIAL PRIMARY KEY,
          image_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(image_id, user_id),
          CONSTRAINT shared_likes_image_id_fkey
          FOREIGN KEY (image_id)
          REFERENCES shared_images(id)
          ON DELETE CASCADE
        );
      `;
      await client.query(createLikesTableSQL);
      console.log('shared_likes 테이블 생성 완료');
      
      console.log('데이터베이스 스키마 수정 완료!');
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
fixDatabaseSchema(); 