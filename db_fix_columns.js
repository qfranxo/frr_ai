require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function fixColumnTypes() {
  try {
    console.log('데이터베이스 컬럼 수정 시작...');
    
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
      // 1. likes 테이블 user_id 타입 변경 (UUID → TEXT)
      console.log('likes 테이블 user_id 타입 확인 중...');
      
      // 테이블 존재 및 컬럼 확인
      const checkLikesSQL = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'likes' AND column_name = 'user_id';
      `;
      const likesResult = await client.query(checkLikesSQL);
      
      if (likesResult.rows.length > 0 && likesResult.rows[0].data_type === 'uuid') {
        // likes 테이블 user_id 타입 변경 (기존 데이터 유지)
        console.log('likes 테이블 user_id 타입을 UUID에서 TEXT로 변경 중...');
        
        // 임시 컬럼 생성
        await client.query(`
          ALTER TABLE likes 
          ADD COLUMN user_id_text TEXT;
        `);
        
        // 데이터 복사 (가능한 경우)
        await client.query(`
          UPDATE likes 
          SET user_id_text = user_id::TEXT 
          WHERE user_id IS NOT NULL;
        `);
        
        // 원래 컬럼 삭제
        await client.query(`
          ALTER TABLE likes 
          DROP COLUMN user_id;
        `);
        
        // 임시 컬럼 이름 변경
        await client.query(`
          ALTER TABLE likes 
          RENAME COLUMN user_id_text TO user_id;
        `);
        
        console.log('likes 테이블 user_id 타입 변경 완료');
      } else {
        console.log('likes 테이블 user_id가 이미 TEXT 타입이거나 테이블이 없습니다');
      }
      
      // 2. comments 테이블 user_id 타입 확인 및 컬럼 추가
      console.log('comments 테이블 구조 확인 중...');
      
      // user_id 타입 확인
      const checkCommentsUserIdSQL = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'user_id';
      `;
      const commentsUserIdResult = await client.query(checkCommentsUserIdSQL);
      
      if (commentsUserIdResult.rows.length > 0 && commentsUserIdResult.rows[0].data_type === 'uuid') {
        // comments 테이블 user_id 타입 변경 (기존 데이터 유지)
        console.log('comments 테이블 user_id 타입을 UUID에서 TEXT로 변경 중...');
        
        // 임시 컬럼 생성
        await client.query(`
          ALTER TABLE comments 
          ADD COLUMN user_id_text TEXT;
        `);
        
        // 데이터 복사 (가능한 경우)
        await client.query(`
          UPDATE comments 
          SET user_id_text = user_id::TEXT 
          WHERE user_id IS NOT NULL;
        `);
        
        // 원래 컬럼 삭제
        await client.query(`
          ALTER TABLE comments 
          DROP COLUMN user_id;
        `);
        
        // 임시 컬럼 이름 변경
        await client.query(`
          ALTER TABLE comments 
          RENAME COLUMN user_id_text TO user_id;
        `);
        
        console.log('comments 테이블 user_id 타입 변경 완료');
      } else {
        console.log('comments 테이블 user_id가 이미 TEXT 타입이거나 테이블이 없습니다');
      }
      
      // user_name 컬럼 확인 및 추가
      const checkCommentsUserNameSQL = `
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'user_name';
      `;
      const commentsUserNameResult = await client.query(checkCommentsUserNameSQL);
      
      if (commentsUserNameResult.rows.length === 0) {
        // user_name 컬럼 추가
        console.log('comments 테이블에 user_name 컬럼 추가 중...');
        await client.query(`
          ALTER TABLE comments 
          ADD COLUMN user_name TEXT;
        `);
        console.log('comments 테이블 user_name 컬럼 추가 완료');
      } else {
        console.log('comments 테이블에 user_name 컬럼이 이미 존재합니다');
      }
      
      console.log('데이터베이스 컬럼 수정 완료!');
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
fixColumnTypes(); 