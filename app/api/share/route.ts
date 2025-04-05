import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { isValidImageUrl, isReplicateUrl } from '@/utils/image-utils';
import { v4 as uuidv4 } from 'uuid';

// 공유 이미지 인터페이스 정의
interface SharedImage {
  user_id: string;
  image_url: string;
  prompt: string;
  aspect_ratio: string;
  rendering_style: string;
  gender: string;
  age: string;
  category: string;
  storage_path: string;
  shared?: boolean; // 옵션으로 변경
  created_at: string;
  original_generation_id: string | null;
  camera_distance?: string;
  eye_color?: string;
  skin_type?: string;
  hair_style?: string;
  model_version?: string;
  source?: string;
  user_name?: string;
  background?: string;
  lighting?: string;
  facial_expression?: string;
  accessories?: string;
  makeup?: string;
  framing?: string;
}

// Replicate URL을 Supabase Storage에 즉시 업로드하는 함수
async function uploadReplicateUrlToStorage(imageUrl: string, userId: string): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    console.log('[업로드] Replicate URL 업로드 시작:', imageUrl.substring(0, 50) + '...');
    
    // 1. 이미지 다운로드 - 더 자세한 오류 처리
    try {
      // 헤더 추가 및 캐시 방지
      const response = await fetch(imageUrl, { 
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (compatible; FRRAIBotUploader/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패 (${response.status}): ${response.statusText}`);
      }
      
      // 2. 이미지 데이터를 Blob으로 변환
      const blob = await response.blob();
      console.log('[업로드] 이미지 다운로드 성공, 크기:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('다운로드된 이미지 크기가 0입니다');
      }
      
      // 3. 파일명 생성 (경로 구조 변경)
      const timestamp = Date.now();
      const safeUserId = userId.substring(0, 8);
      const uuid = uuidv4().substring(0, 8);
      const filename = `${timestamp}_${safeUserId}_${uuid}.webp`;
      
      // 4. 이미지를 'image/shared' 경로에 저장
      const storagePath = `shared/${filename}`;
      
      // 5. 버킷 시도 (images만 사용)
      const bucketName = 'image';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, blob, {
          contentType: 'image/webp',
          upsert: true
        });
      
      if (error) {
        console.error(`[업로드] 업로드 실패:`, error.message);
        return null;
      }
      
      // 업로드 성공
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);
      
      if (urlData && urlData.publicUrl) {
        const uploadedUrl = urlData.publicUrl;
        const uploadedPath = `${bucketName}/${storagePath}`;
        console.log(`[업로드] 성공! URL: ${uploadedUrl}`);
        
        return {
          publicUrl: uploadedUrl,
          storagePath: uploadedPath
        };
      }
      
      return null;
    } catch (downloadError) {
      console.error('[업로드] Replicate 이미지 다운로드 오류:', downloadError);
      return null;
    }
  } catch (error) {
    console.error('[업로드] 이미지 업로드 중 오류:', error);
    return null;
  }
}

// 개선된 Share API - Replicate URL은 fallback 처리 없이 그대로 사용
export async function POST(request: Request) {
  try {
    // 1. 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // 2. 요청 데이터 파싱
    let requestData: any = {};
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        
        // 디버깅: 받은 formData 확인
        console.log('🔍 API가 받은 formData 필드:');
        const formDataEntries = Array.from(formData.entries());
        console.log(formDataEntries);
        
        formData.forEach((value, key) => {
          requestData[key] = value;
        });
        
        // 필드명 표준화 - 클라이언트/서버 필드명 일관성 확보
        // camelCase와 snake_case 모두 지원
        if (requestData.imageUrl && !requestData.image_url) {
          requestData.image_url = requestData.imageUrl;
          console.log('🔄 필드 변환: imageUrl → image_url');
        }
        if (requestData.renderingStyle && !requestData.rendering_style) {
          requestData.rendering_style = requestData.renderingStyle;
          console.log('🔄 필드 변환: renderingStyle → rendering_style');
        }
        if (requestData.aspectRatio && !requestData.aspect_ratio) {
          requestData.aspect_ratio = requestData.aspectRatio;
          console.log('🔄 필드 변환: aspectRatio → aspect_ratio');
        }
        
        // 중요: 이미 존재하는 필드는 덮어쓰지 않음
        if (requestData.selectedCategory && !requestData.category) {
          requestData.category = requestData.selectedCategory;
          console.log('🔄 필드 변환: selectedCategory → category');
        }
        // 추가 필드 표준화
        if (requestData.cameraDistance && !requestData.camera_distance) {
          requestData.camera_distance = requestData.cameraDistance;
        }
        if (requestData.eyeColor && !requestData.eye_color) {
          requestData.eye_color = requestData.eyeColor;
        }
        if (requestData.skinType && !requestData.skin_type) {
          requestData.skin_type = requestData.skinType;
        }
        if (requestData.hairStyle && !requestData.hair_style) {
          requestData.hair_style = requestData.hairStyle;
        }
        if (requestData.modelVersion && !requestData.model_version) {
          requestData.model_version = requestData.modelVersion;
        }
        if (requestData.userName && !requestData.user_name) {
          requestData.user_name = requestData.userName;
        }
        // 추가 확장 필드 표준화
        if (requestData.facialExpression && !requestData.facial_expression) {
          requestData.facial_expression = requestData.facialExpression;
        }
      } else if (contentType.includes('application/json')) {
        requestData = await request.json();
        
        // JSON 요청도 필드명 표준화
        if (requestData.imageUrl && !requestData.image_url) {
          requestData.image_url = requestData.imageUrl;
        }
        if (requestData.renderingStyle && !requestData.rendering_style) {
          requestData.rendering_style = requestData.renderingStyle;
        }
        if (requestData.aspectRatio && !requestData.aspect_ratio) {
          requestData.aspect_ratio = requestData.aspectRatio;
        }
        if (requestData.selectedCategory && !requestData.category) {
          requestData.category = requestData.selectedCategory;
        }
        // 추가 필드 표준화
        if (requestData.cameraDistance && !requestData.camera_distance) {
          requestData.camera_distance = requestData.cameraDistance;
        }
        if (requestData.eyeColor && !requestData.eye_color) {
          requestData.eye_color = requestData.eyeColor;
        }
        if (requestData.skinType && !requestData.skin_type) {
          requestData.skin_type = requestData.skinType;
        }
        if (requestData.hairStyle && !requestData.hair_style) {
          requestData.hair_style = requestData.hairStyle;
        }
        if (requestData.modelVersion && !requestData.model_version) {
          requestData.model_version = requestData.modelVersion;
        }
        if (requestData.userName && !requestData.user_name) {
          requestData.user_name = requestData.userName;
        }
        // 추가 확장 필드 표준화
        if (requestData.facialExpression && !requestData.facial_expression) {
          requestData.facial_expression = requestData.facialExpression;
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Unsupported Content-Type' 
        }, { status: 400 });
      }
      
      // 디버깅: 표준화 후 requestData 확인
      console.log('🔄 정규화된 데이터:', {
        aspect_ratio: requestData.aspect_ratio,
        user_name: requestData.user_name,
        rendering_style: requestData.rendering_style,
        source: requestData.source,
        category: requestData.category,
        background: requestData.background
      });
    } catch (parseError) {
      return NextResponse.json({ 
        success: false, 
        error: `요청 데이터 파싱 오류` 
      }, { status: 400 });
    }

    // 3. 필수 데이터 확인
    const prompt = requestData.prompt;
    let imageUrl = requestData.image_url || requestData.imageUrl;
    
    if (!isValidImageUrl(imageUrl) || !prompt) {
      return NextResponse.json({ 
        success: false, 
        error: '필수 필드가 누락되었습니다: image_url, prompt' 
      }, { status: 400 });
    }
    
    // 원본 데이터 그대로 저장을 위한 플래그 추가
    const PRESERVE_ORIGINAL_VALUES = true;

    // 4. DB에 저장할 데이터 준비 (원본 URL 유지)
    // 원시 데이터 직접 전달 - 내부 변환 없이 그대로 전달
    const sharedImage: SharedImage = {
      user_id: userId,
      image_url: imageUrl,
      prompt,
      // 타입 에러 해결을 위한 필수 필드들 (기본값 없이)
      aspect_ratio: '',
      rendering_style: '',
      gender: '',
      age: '',
      category: '',
      storage_path: '',
      shared: true,
      created_at: new Date().toISOString(),
      original_generation_id: null
    };
    
    // 핵심: 추가 필드는 클라이언트에서 보낸 값이 있는 경우만 추가
    // '' 빈 문자열도 전송하지 않도록 수정
    
    // 값이 있는 경우만 객체에 추가하는 헬퍼 함수
    const addIfExists = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        console.log(`✅ 필드 추가: ${key} = ${value}`);
        (sharedImage as any)[key] = value;
      }
    };
    
    // 중요 필드들 (사용자가 설정 가능한 필드)
    if (PRESERVE_ORIGINAL_VALUES) {
      // 핵심 필드들 (중요)
      addIfExists('aspect_ratio', requestData.aspect_ratio);
      addIfExists('rendering_style', requestData.rendering_style);
      addIfExists('gender', requestData.gender);
      addIfExists('age', requestData.age);
      addIfExists('category', requestData.category);
      addIfExists('background', requestData.background);
      
      // 메타데이터 필드들
      addIfExists('storage_path', requestData.storage_path);
      addIfExists('original_generation_id', requestData.original_generation_id);
      addIfExists('source', requestData.source);
      addIfExists('user_name', requestData.user_name);
      
      // 추가 세부 필드들
      addIfExists('camera_distance', requestData.camera_distance);
      addIfExists('eye_color', requestData.eye_color);
      addIfExists('skin_type', requestData.skin_type);
      addIfExists('hair_style', requestData.hair_style);
      addIfExists('model_version', requestData.model_version);
      addIfExists('lighting', requestData.lighting);
      addIfExists('facial_expression', requestData.facial_expression);
    } else {
      // 기존 방식 (문제 있는 코드)
      sharedImage.aspect_ratio = requestData.aspect_ratio || '';
      sharedImage.rendering_style = requestData.rendering_style || '';
      sharedImage.gender = requestData.gender || '';
      sharedImage.age = requestData.age || '';
      sharedImage.category = requestData.category || '';
      sharedImage.storage_path = requestData.storage_path || '';
      sharedImage.shared = true;
      sharedImage.created_at = new Date().toISOString();
      sharedImage.original_generation_id = requestData.original_generation_id || null;
      sharedImage.camera_distance = requestData.camera_distance || '';
      sharedImage.eye_color = requestData.eye_color || '';
      sharedImage.skin_type = requestData.skin_type || '';
      sharedImage.hair_style = requestData.hair_style || '';
      sharedImage.model_version = requestData.model_version || '';
      sharedImage.source = requestData.source || '';
      sharedImage.user_name = requestData.user_name || '';
      sharedImage.background = requestData.background || '';
      sharedImage.lighting = requestData.lighting || '';
      sharedImage.facial_expression = requestData.facial_expression || '';
      sharedImage.accessories = requestData.accessories || '';
      sharedImage.makeup = requestData.makeup || '';
      sharedImage.framing = requestData.framing || '';
    }
    
    // 항상 필요한 필드
    sharedImage.shared = true;
    sharedImage.created_at = new Date().toISOString();

    // 전체 원본 데이터 로깅 - 디버깅용
    console.log('📊 클라이언트에서 보낸 원본 데이터:', {
      aspect_ratio: requestData.aspect_ratio,
      category: requestData.category,
      background: requestData.background,
      gender: requestData.gender,
      age: requestData.age
    });

    // aspect_ratio와 user_name 디버깅 로그 추가
    console.log('📏 저장할 aspect_ratio 값:', {
      raw: requestData.aspect_ratio,
      camelCase: requestData.aspectRatio,
      final: sharedImage.aspect_ratio
    });
    
    console.log('👤 저장할 user_name 값:', {
      raw: requestData.user_name,
      camelCase: requestData.userName,
      userObject: userId ? '있음' : '없음',
      final: sharedImage.user_name
    });

    // 5. shared 필드 검증 (없으면 제거)
    try {
      const { data: tableInfo, error: tableInfoError } = await supabase
        .from('shared_images')
        .select('*')
        .limit(1);
        
      if (tableInfoError) {
        console.error('테이블 정보 조회 오류:', tableInfoError);
        delete sharedImage.shared;
      } else {
        const sampleRow = tableInfo && tableInfo.length > 0 ? tableInfo[0] : null;
        
        if (sampleRow) {
          console.log('📋 테이블 스키마 확인 중...');
          console.log('📋 샘플 레코드 필드:', Object.keys(sampleRow).join(', '));
          
          // 저장 전 원본 데이터 백업
          const originalData = {...sharedImage};
          
          // 테이블에 필드가 있는지 확인하고 없는 필드는 객체에서 제거
          for (const field in sharedImage) {
            if (!(field in sampleRow)) {
              console.log(`📋 테이블에 '${field}' 필드가 없어 제거합니다`);
              delete (sharedImage as any)[field];
            }
          }
          
          // 제거된 필드 확인
          const removedFields = Object.keys(originalData).filter(key => !(key in sharedImage));
          if (removedFields.length > 0) {
            console.log('📋 제거된 필드:', removedFields.join(', '));
          }
        } else {
          console.log('📋 테이블에 레코드가 없어 스키마를 확인할 수 없습니다');
        }
      }

      // 6. Supabase DB에 저장
      console.log('📝 DB에 저장할 데이터 (최종):', {
        // 중요 필드만 선택해서 로깅
        user_id: sharedImage.user_id,
        image_url: sharedImage.image_url.substring(0, 30) + '...',
        prompt: sharedImage.prompt.substring(0, 30) + '...',
        aspect_ratio: sharedImage.aspect_ratio || '(빈값)',
        rendering_style: sharedImage.rendering_style || '(빈값)',
        category: sharedImage.category || '(빈값)',
        background: (sharedImage as any).background || '(없음)',
        gender: sharedImage.gender || '(빈값)',
        age: sharedImage.age || '(빈값)',
        // 중요: 이 값들이 원래의 값인지 확인
        original_aspect_ratio: requestData.aspect_ratio,
        original_category: requestData.category,
        // 전체 필드 목록
        all_fields: Object.keys(sharedImage).join(', ')
      });
      
      // 저장 시도
      try {
        const { data, error } = await supabase
          .from('shared_images')
          .insert([sharedImage])
          .select();
        
        console.log('📝 Supabase 응답:', { 
          success: !error, 
          data: data ? data.length + '개 레코드' : 'none',
          error: error ? error.message : 'none'
        });
        
        if (error) {
          console.error('📝 DB 저장 오류:', error);
          
          // PostgreSQL 상세 에러 확인
          if (error.code) {
            console.error('📝 PostgreSQL 에러 코드:', error.code);
            console.error('📝 PostgreSQL 에러 상세:', error.details);
            
            // PGRST204 오류(칼럼 없음) 처리
            if (error.code === 'PGRST204' && error.message) {
              // 오류 메시지에서 없는 컬럼 이름 추출
              const match = error.message.match(/Could not find the '(\w+)' column/);
              if (match && match[1]) {
                const missingColumn = match[1];
                console.log(`⚠️ 컬럼 없음 오류 발견: '${missingColumn}' 컬럼이 테이블에 없습니다. 제거 후 재시도합니다.`);
                
                // 해당 필드 제거
                delete (sharedImage as any)[missingColumn];
                
                // 다시 시도
                console.log('🔄 누락된 필드 제거 후 다시 시도합니다:', Object.keys(sharedImage).join(', '));
                const retryResult = await supabase
                  .from('shared_images')
                  .insert([sharedImage])
                  .select();
                
                if (retryResult.error) {
                  console.error('📝 재시도 DB 저장 오류:', retryResult.error);
                  return NextResponse.json({ 
                    success: false, 
                    error: `DB 재시도 오류: ${retryResult.error.message}` 
                  }, { status: 500 });
                }
                
                if (!retryResult.data || retryResult.data.length === 0) {
                  return NextResponse.json({ 
                    success: false, 
                    error: '필드 제거 후 재시도했으나 DB에서 데이터를 반환하지 않았습니다.' 
                  }, { status: 500 });
                }
                
                // 재시도 성공
                return NextResponse.json({ 
                  success: true, 
                  data: retryResult.data[0], 
                  message: '일부 필드를 제외하고 이미지가 성공적으로 공유되었습니다.'
                });
              }
            }
          }
          
          return NextResponse.json({ 
            success: false, 
            error: `DB 오류: ${error.message}` 
          }, { status: 500 });
        }

        if (!data || data.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: '이미지 공유 성공했으나 DB에서 데이터를 반환하지 않았습니다.' 
          }, { status: 500 });
        }

        // 7. 성공 응답
        return NextResponse.json({ 
          success: true, 
          data: data[0], 
          message: '이미지가 성공적으로 공유되었습니다.'
        });
      } catch (dbError: any) {
        console.error('📝 DB 예외 발생:', dbError);
        return NextResponse.json({ 
          success: false, 
          error: `DB 작업 오류: ${dbError.message || '알 수 없는 오류'}` 
        }, { status: 500 });
      }
    } catch (dbError) {
      return NextResponse.json({ 
        success: false, 
        error: `DB 작업 오류` 
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET 메서드도 추가 - URL 복사에 사용 
export async function GET(request: Request) {
  return NextResponse.json({ 
    success: false, 
    error: 'GET 메서드는 지원되지 않습니다. 이미지 공유에는 POST 요청을 사용하세요.' 
  }, { status: 405 });
} 