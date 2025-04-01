require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function addForeignKeyRelation() {
  try {
    console.log('테이블 간 외래 키 관계 설정 시작...');
    
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
      // 1. shared_images 테이블이 없으면 생성
      console.log('shared_images 테이블 존재 확인 중...');
      const createImagesTableSQL = `
        CREATE TABLE IF NOT EXISTS shared_images (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_name TEXT,
          image_url TEXT NOT NULL,
          prompt TEXT,
          rendering_style TEXT,
          gender TEXT,
          age TEXT,
          aspect_ratio TEXT,
          category TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await client.query(createImagesTableSQL);
      console.log('shared_images 테이블 확인 완료');
      
      // 2. shared_comments 테이블이 없으면 생성
      console.log('shared_comments 테이블 존재 확인 중...');
      const createCommentsTableSQL = `
        CREATE TABLE IF NOT EXISTS shared_comments (
          id TEXT PRIMARY KEY,
          image_id TEXT,
          user_id TEXT,
          user_name TEXT,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await client.query(createCommentsTableSQL);
      console.log('shared_comments 테이블 확인 완료');
      
      // 3. 외래 키 제약 조건 추가 (이미 존재하면 건너뜀)
      console.log('외래 키 제약 조건 추가 중...');
      const addForeignKeySQL = `
        DO $$
        BEGIN
          -- 외래 키가 이미 존재하는지 확인
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'shared_comments_image_id_fkey'
          ) THEN
            -- 외래 키 추가
            ALTER TABLE shared_comments
            ADD CONSTRAINT shared_comments_image_id_fkey
            FOREIGN KEY (image_id)
            REFERENCES shared_images(id)
            ON DELETE CASCADE;
          END IF;
        END
        $$;
      `;
      await client.query(addForeignKeySQL);
      console.log('외래 키 제약 조건 추가 완료');
      
      console.log('테이블 간 외래 키 관계 설정 완료!');
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
addForeignKeyRelation(); 