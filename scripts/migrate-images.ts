/**
 * 이미지 마이그레이션 스크립트
 * 
 * Replicate URL로 저장된 이미지들을 Supabase Storage로 마이그레이션합니다.
 * 
 * 실행 방법:
 * 1. npm install -g ts-node (없을 경우)
 * 2. npm run migrate-images -- [options]
 * 
 * 옵션:
 * --table=<table-name>   마이그레이션할 테이블 (shared_images, generated_images)
 * --batch=<size>         한 번에 처리할 이미지 수 (기본값: 5)
 * --all                  모든 테이블 마이그레이션
 * --dry-run              실제로 마이그레이션하지 않고 시뮬레이션만 실행
 * --help                 도움말 표시
 */

import { supabase } from '../lib/supabase';
import { storeImageFromReplicate } from '../utils/image-storage';
import { isReplicateUrl, isSupabaseUrl } from '../utils/image-utils';
import { v4 as uuidv4 } from 'uuid';

// CLI 옵션 파싱
interface CliOptions {
  table?: string;
  batchSize: number;
  dryRun: boolean;
  all: boolean;
  help: boolean;
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    batchSize: 5,
    dryRun: false,
    all: false,
    help: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--table=')) {
      options.table = arg.split('=')[1];
    } else if (arg.startsWith('--batch=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10) || 5;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--help') {
      options.help = true;
    }
  });

  return options;
}

// 도움말 표시
function showHelp() {
  console.log(`
이미지 마이그레이션 스크립트 - Replicate URL을 Supabase Storage로 마이그레이션

사용법: npm run migrate-images -- [options]

옵션:
  --table=<table-name>   마이그레이션할 테이블 (shared_images, user_images)
  --batch=<size>         한 번에 처리할 이미지 수 (기본값: 5)
  --all                  모든 테이블 마이그레이션
  --dry-run              실제로 마이그레이션하지 않고 시뮬레이션만 실행
  --help                 도움말 표시

예시:
  npm run migrate-images -- --table=shared_images
  npm run migrate-images -- --all --batch=10
  npm run migrate-images -- --dry-run
  `);
}

// 순차적으로 실행하기 위한 유틸리티 함수
async function processBatch<T, U>(
  items: T[],
  batchSize: number,
  processItem: (item: T, index: number) => Promise<U>,
  dryRun: boolean = false
): Promise<U[]> {
  const results: U[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`처리 중: ${i + 1} ~ ${Math.min(i + batch.length, items.length)} / ${items.length}`);
    
    if (dryRun) {
      // Dry run 모드에서는 실제 처리 없이 로그만 출력
      console.log(`[Dry Run] ${batch.length}개 항목 처리 시뮬레이션`);
      const dummyResults = batch.map((_, index) => 
        processItem({ ..._, dryRun: true } as any, i + index)
      );
      results.push(...await Promise.all(dummyResults));
    } else {
      // 실제 처리
      const batchResults = await Promise.all(
        batch.map((item, index) => processItem(item, i + index))
      );
      results.push(...batchResults);
    }
  }
  
  return results;
}

// 결과 타입 정의
interface MigrationResult {
  id: string | number;
  success: boolean;
  message?: string;
  originalUrl?: string;
  newUrl?: string;
}

// 환경 체크 함수
async function checkEnvironment(): Promise<boolean> {
  console.log('환경 설정 검사 중...');
  
  // 1. Supabase 접근 정보 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    console.error('NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.');
    return false;
  }
  
  // 2. Supabase Storage 버킷 접근 테스트
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Supabase Storage 버킷 접근 오류:', error);
      return false;
    }
    
    const hasBuckets = buckets && buckets.some(b => 
      b.name === 'shared' || b.name === 'generations' || b.name === 'avatars'
    );
    
    if (!hasBuckets) {
      console.warn('경고: 필수 Storage 버킷이 없습니다. 마이그레이션 전에 버킷을 생성하세요.');
    }
  } catch (error) {
    console.error('Supabase Storage 테스트 중 오류 발생:', error);
    return false;
  }
  
  // 3. 데이터베이스 접근 테스트
  try {
    const { count, error } = await supabase
      .from('shared_images')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('데이터베이스 접근 오류:', error);
      console.error('Supabase 권한을 확인하세요.');
      return false;
    }
    
    console.log(`데이터베이스 테스트 성공. 공유 이미지 개수: ${count}`);
  } catch (error) {
    console.error('데이터베이스 테스트 중 오류 발생:', error);
    return false;
  }
  
  console.log('환경 설정 검사 완료: 모든 설정이 유효합니다.');
  return true;
}

// 공유 이미지 마이그레이션 (shared_images 테이블)
async function migrateSharedImages(batchSize: number = 5, dryRun: boolean = false): Promise<MigrationResult[]> {
  console.log('공유 이미지 마이그레이션 시작...');
  
  // 1. Replicate URL을 가진 공유 이미지 가져오기
  const { data: sharedImages, error } = await supabase
    .from('shared_images')
    .select('*')
    .filter('image_url', 'ilike', '%replicate.delivery%');
  
  if (error) {
    console.error('공유 이미지 조회 오류:', error);
    return [];
  }
  
  console.log(`마이그레이션할 공유 이미지 수: ${sharedImages?.length || 0}`);
  
  if (!sharedImages || sharedImages.length === 0) {
    console.log('마이그레이션할 공유 이미지가 없습니다.');
    return [];
  }
  
  // 2. 각 이미지를 Supabase Storage에 저장
  const results = await processBatch<any, MigrationResult>(
    sharedImages,
    batchSize,
    async (image, index) => {
      try {
        // Replicate URL 확인
        if (!isReplicateUrl(image.image_url)) {
          console.log(`[${index + 1}] Replicate URL이 아닙니다:`, image.image_url);
          return {
            id: image.id,
            success: false,
            message: 'Replicate URL이 아닙니다',
            originalUrl: image.image_url
          };
        }
        
        console.log(`[${index + 1}] 이미지 처리 중:`, image.id);
        
        // Dry run 모드에서는 실제 저장하지 않음
        if (dryRun || image.dryRun) {
          console.log(`[Dry Run] 이미지를 저장하고 DB를 업데이트할 것입니다:`, image.id);
          return {
            id: image.id,
            success: true,
            message: '[Dry Run] 성공 시뮬레이션',
            originalUrl: image.image_url,
            newUrl: `https://example.com/storage/shared_${image.id}.webp`
          };
        }
        
        // Supabase Storage에 저장
        const result = await storeImageFromReplicate(
          image.image_url,
          image.user_id,
          {
            filename: `shared_${image.id}_${Date.now()}.webp`,
            folder: 'shared'
          }
        );
        
        // DB 업데이트
        const { error: updateError } = await supabase
          .from('shared_images')
          .update({
            image_url: result.publicUrl,
            storage_path: result.storagePath,
            updated_at: new Date().toISOString()
          })
          .eq('id', image.id);
        
        if (updateError) {
          console.error(`[${index + 1}] DB 업데이트 오류:`, updateError);
          return {
            id: image.id,
            success: false,
            message: `DB 업데이트 오류: ${updateError.message}`,
            originalUrl: image.image_url
          };
        }
        
        console.log(`[${index + 1}] 성공:`, image.id, result.publicUrl);
        return {
          id: image.id,
          success: true,
          newUrl: result.publicUrl,
          originalUrl: image.image_url
        };
      } catch (error) {
        console.error(`[${index + 1}] 오류:`, error);
        return {
          id: image.id,
          success: false,
          message: error instanceof Error ? error.message : String(error),
          originalUrl: image.image_url
        };
      }
    },
    dryRun
  );
  
  // 3. 결과 요약
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log('\n=== 공유 이미지 마이그레이션 완료 ===');
  console.log(`총 처리: ${results.length}`);
  console.log(`성공: ${successCount}`);
  console.log(`실패: ${failCount}`);
  
  // 실패한 항목 출력
  if (failCount > 0) {
    console.log('\n실패한 항목:');
    results.filter(r => !r.success).forEach((r, i) => {
      console.log(`${i + 1}. ID: ${r.id}, 메시지: ${r.message}, URL: ${r.originalUrl}`);
    });
  }
  
  return results;
}

// 마이그레이션 실행
async function runMigration() {
  // CLI 옵션 파싱
  const options = parseCliOptions();
  
  // 도움말 표시
  if (options.help) {
    showHelp();
    return;
  }
  
  try {
    console.log('이미지 마이그레이션 시작...');
    console.log('설정:', options);
    
    // 환경 설정 체크
    if (!options.dryRun) {
      const isEnvironmentValid = await checkEnvironment();
      if (!isEnvironmentValid) {
        console.error('환경 설정 검사 실패: 마이그레이션을 진행할 수 없습니다.');
        console.log('dry-run 모드로 다시 시도하세요: npm run migrate-images -- --dry-run');
        return;
      }
    }
    
    if (options.dryRun) {
      console.log('\n*** DRY RUN 모드: 실제 마이그레이션이 실행되지 않습니다 ***\n');
    }
    
    let results: MigrationResult[] = [];
    
    // 테이블 기반으로 마이그레이션 실행
    if (options.all || (!options.table && !options.all)) {
      // 모든 테이블 마이그레이션
      const sharedResults = await migrateSharedImages(options.batchSize, options.dryRun);
      results = [...results, ...sharedResults];
    } else if (options.table === 'shared_images') {
      // 공유 이미지만 마이그레이션
      const sharedResults = await migrateSharedImages(options.batchSize, options.dryRun);
      results = [...results, ...sharedResults];
    }
    
    console.log('\n전체 마이그레이션 완료!');
    
    // 전체 성공/실패 통계
    const totalSuccess = results.filter(r => r.success).length;
    const totalFail = results.filter(r => !r.success).length;
    
    console.log('\n=== 전체 통계 ===');
    console.log(`총 처리: ${results.length}`);
    console.log(`총 성공: ${totalSuccess}`);
    console.log(`총 실패: ${totalFail}`);
    
    if (options.dryRun) {
      console.log('\n*** 이것은 DRY RUN이었습니다. 실제 변경사항은 없습니다 ***');
    }
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  }
}

// 스크립트 실행
runMigration().catch(console.error); 