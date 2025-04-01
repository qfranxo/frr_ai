require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = 'postgresql://postgres.nipdzyfwjqpgojccoqgm:vxePeqNCLMKBDe6P@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?ssl=true';

async function addUserNameColumn() {
  try {
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
      const sql = 'ALTER TABLE generations ADD COLUMN IF NOT EXISTS user_name varchar(255)';
      console.log('SQL 실행 중:', sql);
      await client.query(sql);
      console.log('user_name 컬럼이 성공적으로 추가되었습니다!');
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
addUserNameColumn(); 