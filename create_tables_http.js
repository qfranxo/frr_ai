require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const https = require('https');

// Supabase 연결 정보 (하드코딩하여 오류 해결)
const SUPABASE_URL = 'https://nipdzyfwjqpgojccoqgm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcGR6eWZ3anFncG9qY2Njb3FnbSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MTQzMDIyMTcsImV4cCI6MjAyOTg3ODIxN30.l6Y69A3zUgYkM8sMqvJwhQnNc-6QZbO8jtWrw7N3JME'; // service_role 키 사용

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL과 SUPABASE_KEY(서비스 또는 익명)가 필요합니다.');
  process.exit(1);
}

// 연결 정보 출력 (디버깅용)
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key 시작 부분:', SUPABASE_KEY.substring(0, 15) + '...');

// SQL 파일 읽기
const sqlContent = fs.readFileSync('./create_tables.sql', 'utf8');
console.log('테이블 생성 SQL 로드 완료');

// HTTP 요청 함수
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            resolve(responseData);
          }
        } else {
          reject({
            statusCode: res.statusCode,
            message: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function createTables() {
  try {
    console.log('Supabase REST API로 테이블 생성 시작...');
    
    // SQL 쿼리 실행 요청
    const url = new URL(SUPABASE_URL);
    
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/rpc/pgclient',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      }
    };
    
    const data = JSON.stringify({
      query: sqlContent
    });
    
    try {
      await makeRequest(options, data);
      console.log('테이블이 성공적으로 생성되었습니다!');
    } catch (error) {
      if (error.statusCode === 404) {
        console.warn('pgclient RPC 함수를 찾을 수 없습니다. 직접 SQL 실행이 필요합니다.');
        console.warn('Supabase SQL 에디터에서 create_tables.sql 파일의 내용을 직접 실행하세요.');
      } else {
        throw error;
      }
    }
    
    // 테이블 RLS 비활성화 시도
    if (SUPABASE_KEY) {
      const tables = ['users', 'generations', 'community_posts', 'comments', 'likes', 'plans', 'user_subscriptions'];
      
      console.log('모든 테이블의 RLS 정책을 비활성화합니다...');
      
      for (const table of tables) {
        try {
          const rlsOptions = { ...options };
          rlsOptions.path = '/rest/v1/rpc/pgclient';
          
          const rlsData = JSON.stringify({
            query: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
          });
          
          await makeRequest(rlsOptions, rlsData);
          console.log(`${table} 테이블의 RLS를 비활성화했습니다.`);
        } catch (error) {
          console.error(`${table} 테이블의 RLS 비활성화 실패:`, error);
        }
      }
    } else {
      console.warn('서비스 역할 키가 없어 RLS 정책을 비활성화할 수 없습니다.');
      console.warn('Table Editor에서 수동으로 각 테이블의 RLS를 비활성화하세요.');
    }
    
    console.log('작업이 완료되었습니다.');
    console.log('Supabase 대시보드에서 Table Editor로 이동하여 테이블이 생성되었는지 확인하세요.');
    console.log('만약 RLS 비활성화가 실패했다면, 각 테이블에 대해 수동으로 RLS를 비활성화하세요.');
    
  } catch (error) {
    console.error('테이블 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

// 테이블 생성 실행
createTables(); 