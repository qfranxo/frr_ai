const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// supabase 연결 객체 생성
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// URL에서 이미지 비율을 추출하는 함수
function getAspectRatioFromUrl(url) {
  if (!url) return null;
  
  // URL에서 크기 정보 추출 (예: 1024x1820 형식을 찾음)
  const sizeMatch = url.match(/(\d+)x(\d+)/);
  if (sizeMatch && sizeMatch.length >= 3) {
    const width = parseInt(sizeMatch[1]);
    const height = parseInt(sizeMatch[2]);
    
    if (width && height) {
      // 비율 계산 및 가장 가까운 표준 비율 반환
      if (width === height) {
        return '1:1';
      } else if (Math.abs(width / height - 16 / 9) < 0.1) {
        return '16:9';
      } else if (Math.abs(width / height - 9 / 16) < 0.1) {
        return '9:16';
      } else if (Math.abs(width / height - 4 / 3) < 0.1) {
        return '4:3';
      } else if (Math.abs(width / height - 3 / 4) < 0.1) {
        return '3:4';
      }
    }
  }
  
  return null;
}

// 스타일에 따른 카테고리 매핑 함수
function getCategoryFromStyle(style) {
  if (!style) return 'portrait';
  
  const styleLower = style.toLowerCase();
  
  // 스타일에 따른 카테고리 매핑 테이블
  const styleToCategory = {
    // 애니메이션 스타일
    'anime': 'anime',
    'digital_illustration': 'anime',
    'digital_illustration/pixel_art': 'anime',
    'digital_illustration/hand_drawn': 'anime',
    'digital_illustration/infantile_sketch': 'anime',
    'cartoon': 'anime',
    
    // 포트레이트 스타일
    'realistic': 'portrait',
    'realistic_image': 'portrait',
    'realistic_image/studio_portrait': 'portrait',
    'realistic_image/natural_light': 'portrait',
    'portrait': 'portrait',
    'photo': 'portrait',
    
    // 풍경 스타일
    'landscape': 'landscape',
    'nature': 'landscape',
    'scenery': 'landscape',
    
    // 도시 스타일
    'city': 'urban',
    'urban': 'urban',
    'architecture': 'urban',
    
    // 판타지 스타일
    'fantasy': 'fantasy',
    'magical': 'fantasy',
    'dragon': 'fantasy',
    
    // 미래적 스타일
    'sci-fi': 'sci-fi',
    'future': 'sci-fi',
    'space': 'sci-fi',
    'futuristic': 'sci-fi',
    'cyber': 'sci-fi',
    
    // 빈티지 스타일
    'vintage': 'vintage',
    'retro': 'vintage',
    'old style': 'vintage',
    'classic': 'vintage'
  };
  
  // 정확한 매칭 먼저 시도
  if (styleToCategory[styleLower]) {
    return styleToCategory[styleLower];
  }
  
  // 부분 매칭으로 카테고리 찾기
  for (const [styleKey, category] of Object.entries(styleToCategory)) {
    if (styleLower.includes(styleKey)) {
      return category;
    }
  }
  
  // 기본값
  return 'portrait';
}

// 비율과 카테고리 업데이트 함수
async function updateAspectRatios() {
  try {
    console.log('shared_images 테이블의 레코드를 가져오는 중...');
    
    // 모든 레코드 가져오기
    const { data: images, error } = await supabase
      .from('shared_images')
      .select('id, image_url, aspect_ratio, rendering_style, category');
    
    if (error) {
      console.error('레코드 조회 오류:', error.message);
      return;
    }
    
    console.log(`총 ${images.length}개의 레코드를 찾았습니다.`);
    
    // 업데이트가 필요한 레코드 필터링
    const recordsToUpdate = images.filter(image => {
      // 비율이 1:1인 경우 강제로 업데이트 대상에 포함 (중요 변경 사항)
      const forceRatioUpdate = image.aspect_ratio === '1:1';
      
      // URL에서 추출한 비율
      const extractedRatio = getAspectRatioFromUrl(image.image_url);
      const normalRatioUpdate = image.aspect_ratio === '1:1' && extractedRatio && extractedRatio !== '1:1';
      
      // 카테고리 업데이트 필요 여부 확인
      const extractedCategory = getCategoryFromStyle(image.rendering_style);
      const needsCategoryUpdate = !image.category || image.category === 'other' || image.category === '';
      
      return forceRatioUpdate || normalRatioUpdate || needsCategoryUpdate;
    });
    
    console.log(`${recordsToUpdate.length}개의 레코드를 업데이트해야 합니다.`);
    
    // 업데이트할 레코드가 없으면 종료
    if (recordsToUpdate.length === 0) {
      console.log('작업 완료: 0개의 레코드를 업데이트했습니다.');
      return;
    }
    
    // 배치 처리를 위해 레코드를 50개씩 나눔
    const batchSize = 50;
    let processed = 0;
    
    for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
      const batch = recordsToUpdate.slice(i, i + batchSize);
      
      // 업데이트 프로미스 생성
      const updatePromises = batch.map(record => {
        // 모든 1:1 비율을 9:16으로 강제 변경 (중요 변경 사항)
        let newRatio;
        if (record.aspect_ratio === '1:1') {
          newRatio = '9:16';
        } else {
          newRatio = getAspectRatioFromUrl(record.image_url) || record.aspect_ratio;
        }
        
        const newCategory = (!record.category || record.category === 'other' || record.category === '') 
          ? getCategoryFromStyle(record.rendering_style) 
          : record.category;
        
        console.log(`ID: ${record.id}, URL: ${record.image_url?.substring(0, 50)}..., 기존 비율: ${record.aspect_ratio}, 새 비율: ${newRatio}, 기존 카테고리: ${record.category}, 새 카테고리: ${newCategory}`);
        
        // 레코드 업데이트
        return supabase
          .from('shared_images')
          .update({ 
            aspect_ratio: newRatio,
            category: newCategory
          })
          .eq('id', record.id);
      });
      
      // 프로미스 실행 및 결과 처리
      const results = await Promise.all(updatePromises);
      
      // 오류 확인
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error(`${errors.length}개의 레코드 업데이트 중 오류 발생:`);
        errors.forEach(err => console.error(err.error));
      }
      
      processed += batch.length - errors.length;
      console.log(`진행 상황: ${processed}/${recordsToUpdate.length} 업데이트 완료`);
    }
    
    console.log(`작업 완료: ${processed}개의 레코드를 업데이트했습니다.`);
  } catch (error) {
    console.error('스크립트 실행 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

// 스크립트 실행
updateAspectRatios()
  .then(() => {
    console.log('스크립트 실행이 완료되었습니다.');
  })
  .catch(error => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 