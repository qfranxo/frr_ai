require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// SSL 인증서 검증 비활성화 (개발 환경에서만 사용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 데이터베이스 연결 문자열
const dbConnectionString = process.env.DATABASE_URL;

async function checkDatabaseTables() {
  try {
    console.log('데이터베이스 테이블 확인 시작...');
    
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
      // 테이블 목록 조회
      const tablesSQL = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `;
      const tablesResult = await client.query(tablesSQL);
      
      console.log('데이터베이스 테이블 목록:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
      
      // 'comments' 테이블 구조 확인
      if (tablesResult.rows.some(row => row.table_name === 'comments')) {
        const commentsColumnsSQL = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'comments';
        `;
        const commentsResult = await client.query(commentsColumnsSQL);
        
        console.log('\n댓글 테이블(comments) 구조:');
        commentsResult.rows.forEach(row => {
          console.log(`- ${row.column_name}: ${row.data_type}`);
        });
      }
      
      // 'likes' 테이블 구조 확인
      if (tablesResult.rows.some(row => row.table_name === 'likes')) {
        const likesColumnsSQL = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'likes';
        `;
        const likesResult = await client.query(likesColumnsSQL);
        
        console.log('\n좋아요 테이블(likes) 구조:');
        likesResult.rows.forEach(row => {
          console.log(`- ${row.column_name}: ${row.data_type}`);
        });
      }
      
      // 'shared_images' 테이블 구조 확인
      if (tablesResult.rows.some(row => row.table_name === 'shared_images')) {
        const imagesColumnsSQL = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'shared_images';
        `;
        const imagesResult = await client.query(imagesColumnsSQL);
        
        console.log('\n공유 이미지 테이블(shared_images) 구조:');
        imagesResult.rows.forEach(row => {
          console.log(`- ${row.column_name}: ${row.data_type}`);
        });
      }
      
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
checkDatabaseTables(); 