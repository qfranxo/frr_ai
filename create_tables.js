require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Supabase 클라이언트 생성
const supabaseUrl = 'https://nipdzyfwjqpgojccoqgm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcGR6eWZ3anFncG9qY2Njb3FnbSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MTQzMDIyMTcsImV4cCI6MjAyOTg3ODIxN30.l6Y69A3zUgYkM8sMqvJwhQnNc-6QZbO8jtWrw7N3JME';

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// PostgreSQL 직접 연결용 설정
const dbConnectionString = 'postgresql://postgres.nipdzyfwjqpgojccoqgm:vxePeqNCLMKBDe6P@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?ssl=true';

console.log('데이터베이스 연결 문자열:', dbConnectionString.substring(0, 30) + '...');

async function createTables() {
  try {
    // SQL 파일 읽기
    const sqlContent = fs.readFileSync('./create_tables.sql', 'utf8');
    
    console.log('테이블 생성 시작...');
    console.log('먼저 Supabase RPC로 시도...');
    
    // 1. Supabase RPC로 시도
    try {
      const { data, error } = await supabase.rpc('pgclient', {
        query: sqlContent
      });
      
      if (error) {
        console.error('Supabase RPC 실패:', error);
        throw error;
      }
      
      console.log('테이블이 성공적으로 생성되었습니다! (Supabase RPC)');
      console.log(data);
    } catch (rpcError) {
      console.log('Supabase RPC 방식 실패, 직접 PostgreSQL 연결 시도...');
      
      try {
        // 2. 직접 PostgreSQL 연결로 시도
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
          console.log('SQL 실행 중...');
          await client.query(sqlContent);
          console.log('테이블이 성공적으로 생성되었습니다! (직접 PostgreSQL 연결)');
        } finally {
          client.release();
        }
        
        await pool.end();
      } catch (pgError) {
        console.error('PostgreSQL 직접 연결도 실패:', pgError);
        throw pgError;
      }
    }
    
    // RLS 정책 비활성화 시도
    try {
      console.log('모든 테이블의 RLS 정책을 비활성화합니다...');
      
      const tables = ['users', 'generations', 'community_posts', 'comments', 'likes', 'plans', 'user_subscriptions'];
      
      for (const table of tables) {
        const { error: rlsError } = await supabase.rpc('pgclient', {
          query: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
        });
        
        if (rlsError) {
          console.error(`${table} 테이블의 RLS 비활성화 실패:`, rlsError);
        } else {
          console.log(`${table} 테이블의 RLS를 비활성화했습니다.`);
        }
      }
    } catch (rlsError) {
      console.warn('RLS 비활성화 중 오류 발생:', rlsError);
      console.warn('Table Editor에서 수동으로 각 테이블의 RLS를 비활성화하세요.');
    }
    
  } catch (error) {
    console.error('테이블 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

// 테이블 생성 실행
createTables(); 