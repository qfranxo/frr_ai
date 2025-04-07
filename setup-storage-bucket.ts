import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL 또는 서비스 키가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase 클라이언트 초기화 (서비스 역할 키 사용)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  try {
    // 1. 'image' 버킷이 존재하는지 확인
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw new Error(`버킷 목록 조회 오류: ${bucketsError.message}`);
    }
    
    const imageBucket = buckets.find(bucket => bucket.name === 'image');
    
    // 2. 버킷이 없으면 생성
    if (!imageBucket) {
      console.log("'image' 버킷이 존재하지 않습니다. 새로 생성합니다...");
      
      const { data, error } = await supabase.storage.createBucket('image', {
        public: true, // 공개 접근 허용
        fileSizeLimit: 10485760, // 10MB 제한
      });
      
      if (error) {
        throw new Error(`버킷 생성 오류: ${error.message}`);
      }
      
      console.log("'image' 버킷을 성공적으로 생성했습니다.");
    } else {
      console.log("'image' 버킷이 이미 존재합니다.");
      
      // 버킷 공개 설정 업데이트
      const { error } = await supabase.storage.updateBucket('image', {
        public: true, // 공개 접근 허용
      });
      
      if (error) {
        throw new Error(`버킷 업데이트 오류: ${error.message}`);
      }
      
      console.log("'image' 버킷의 공개 접근 설정을 업데이트했습니다.");
    }
    
    // 3. 버킷 폴더 구조 확인 및 생성
    const folders = ['shared', 'generations', 'user-images'];
    
    for (const folder of folders) {
      try {
        // 폴더 구조를 확인하기 위해 빈 파일 업로드 시도
        const { data, error } = await supabase.storage
          .from('image')
          .upload(`${folder}/.keep`, new Blob(['']), { upsert: true });
        
        if (error && error.message !== 'The resource already exists') {
          console.warn(`${folder} 폴더 생성 중 오류: ${error.message}`);
        } else {
          console.log(`${folder} 폴더가 준비되었습니다.`);
        }
      } catch (folderError) {
        console.warn(`${folder} 폴더 확인 중 오류: ${folderError}`);
      }
    }
    
    console.log("스토리지 버킷 설정이 완료되었습니다!");
  } catch (error) {
    console.error("스토리지 버킷 설정 중 오류가 발생했습니다:", error);
    process.exit(1);
  }
}

// 스크립트 실행
setupStorageBucket(); 