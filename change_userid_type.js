require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = 'postgresql://postgres.nipdzyfwjqpgojccoqgm:vxePeqNCLMKBDe6P@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?ssl=true';

async function changeUserIdType() {
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
      // 먼저 제약 조건 제거
      console.log('외래 키 제약 조건 제거 중...');
      await client.query(`
        DO $$ 
        BEGIN
          -- 먼저 外래 키 제약 조건이 있는지 확인하고 제거
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY' 
            AND table_name = 'generations' 
            AND constraint_name = 'generations_user_id_fkey'
          ) THEN
            ALTER TABLE generations DROP CONSTRAINT generations_user_id_fkey;
          END IF;
        END $$;
      `);
      
      // user_id 컬럼 타입 변경
      console.log('user_id 컬럼 타입을 TEXT로 변경 중...');
      await client.query(`ALTER TABLE generations ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`);
      
      // users 테이블의 id 컬럼도 TEXT로 변경
      console.log('users 테이블의 id 컬럼 타입도 TEXT로 변경 중...');
      await client.query(`
        DO $$ 
        BEGIN
          -- 먼저 外래 키 제약 조건을 모두 찾아서 제거
          EXECUTE (
            SELECT string_agg('ALTER TABLE ' || quote_ident(tc.table_schema) || '.' || 
                              quote_ident(tc.table_name) || ' DROP CONSTRAINT ' || 
                              quote_ident(tc.constraint_name) || ';', ' ')
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
              ON tc.constraint_catalog = ccu.constraint_catalog 
              AND tc.constraint_schema = ccu.constraint_schema
              AND tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
          );
          
          -- id 컬럼 타입 변경
          ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
        END $$;
      `);
      
      console.log('모든 컬럼 타입이 성공적으로 변경되었습니다!');
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
changeUserIdType(); 