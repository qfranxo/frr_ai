import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // 1. 'image' 버킷이 존재하는지 확인
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      throw new Error(`버킷 목록 조회 오류: ${bucketsError.message}`);
    }
    
    const imageBucket = buckets.find(bucket => bucket.name === 'image');
    
    // 2. 버킷이 없으면 생성
    if (!imageBucket) {
      console.log("'image' 버킷이 존재하지 않습니다. 새로 생성합니다...");
      
      const { data, error } = await supabaseAdmin.storage.createBucket('image', {
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
      const { error } = await supabaseAdmin.storage.updateBucket('image', {
        public: true, // 공개 접근 허용
      });
      
      if (error) {
        throw new Error(`버킷 업데이트 오류: ${error.message}`);
      }
      
      console.log("'image' 버킷의 공개 접근 설정을 업데이트했습니다.");
    }
    
    // 3. 버킷 폴더 구조 확인 및 생성
    const folders = ['shared', 'generations', 'user-images'];
    const results = [];
    
    for (const folder of folders) {
      try {
        // 폴더가 존재하는지 확인하는 대신 빈 파일을 업로드하여 폴더 생성
        const { data, error } = await supabaseAdmin.storage
          .from('image')
          .upload(`${folder}/.folder`, new Blob([]), {
            upsert: true
          });
          
        if (error && error.message !== 'The resource already exists') {
          results.push({ folder, success: false, error: error.message });
        } else {
          results.push({ folder, success: true });
        }
      } catch (folderError) {
        results.push({ 
          folder, 
          success: false, 
          error: folderError instanceof Error ? folderError.message : String(folderError) 
        });
      }
    }
    
    // 4. 정책 설정
    // RLS 정책은 대시보드에서 직접 설정해야 합니다.
    // API에서는 정책 설정이 제한적입니다.
    
    return NextResponse.json({
      success: true,
      message: "스토리지 버킷 설정이 완료되었습니다",
      bucketExists: !!imageBucket,
      folders: results
    });
  } catch (error) {
    console.error("스토리지 버킷 설정 오류:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 