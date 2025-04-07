import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { isValidImageUrl, isReplicateUrl } from '@/utils/image-utils';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { generations, communityPosts } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

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
}

// URL에서 이미지 비율을 추출하는 함수 (맨 위에 추가)
function getAspectRatioFromUrl(url: string): string {
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
  
  // 매칭되는 패턴이 없거나 비율을 계산할 수 없는 경우 기본값 반환
  return '1:1';
}

// 프롬프트 기반 카테고리 분류 함수 강화
function getCategoryFromPrompt(prompt?: string | null, styleName?: string | null): string {
  // 키워드 기반 카테고리 맵핑 확장
  const categoryKeywords: Record<string, string[]> = {
    'landscape': [
      'landscape', 'mountain', 'nature', 'lake', 'forest', 'ocean', 'sea', 'sunset', 'sunrise', 
      'valley', 'canyon', 'waterfall', 'scenery', 'outdoor', 'natural', 'scenic', 'vista', 
      'panorama', 'horizon', 'river', 'beach', 'hill', 'sky', 'cloud', 'field', 'grass',
      'national park', 'woods', 'countryside', 'rural', 'meadow', 'desert', 'island'
    ],
    'portrait': [
      'portrait', 'person', 'face', 'woman', 'man', 'girl', 'boy', 'people', 'human', 
      'facial', 'self', 'headshot', 'selfie', 'photo of a person', 'photo of a face',
      'photograph of a person', 'close-up', 'closeup', 'head', 'profile', 'bust'
    ],
    'urban': [
      'urban', 'city', 'street', 'building', 'architecture', 'downtown', 'skyscraper', 
      'metropolis', 'town', 'skyline', 'cityscape', 'infrastructure', 'bridge', 'road',
      'traffic', 'avenue', 'boulevard', 'alley', 'neighborhood', 'district', 'urban landscape',
      'urban scene'
    ],
    'anime': [
      'anime', 'manga', 'cartoon', 'comic', 'animation', 'animated', 'toon', 'chibi',
      'japanese animation', 'anime style', 'anime character', 'anime girl', 'anime boy',
      'anime portrait', 'manga style', 'comic book'
    ],
    'fantasy': [
      'fantasy', 'magical', 'dragon', 'fairy', 'elf', 'wizard', 'mythical', 'mystic', 
      'enchanted', 'creature', 'magic', 'sorcery', 'myth', 'legend', 'fantasy world',
      'fantasy landscape', 'fantasy character', 'magical creature', 'dwarf', 'orc', 'giant',
      'castle', 'kingdom', 'medieval fantasy', 'high fantasy'
    ],
    'sci-fi': [
      'sci-fi', 'science fiction', 'futuristic', 'robot', 'space', 'alien', 'cyber', 'galaxy',
      'neon', 'future', 'spacecraft', 'spaceship', 'technology', 'cyberpunk', 'cyborg',
      'dystopian', 'planetary', 'universe', 'stars', 'tech', 'advanced', 'space station',
      'space colony', 'futuristic city'
    ],
    'vintage': [
      'vintage', 'retro', 'old', 'classic', 'antique', 'history', 'nostalgic', 'ancient',
      'old-fashioned', 'historical', 'aged', 'era', 'period', 'past', 'bygone', 'traditional',
      'heritage', 'legacy', 'victorian', 'edwardian', 'vintage style', 'retro style', 'sepia',
      'photograph style', 'vintage photograph', 'old photograph', 'toned portrait', 'aged photo',
      'sepia toned', 'old time', 'vintage look', 'vintage aesthetic', 'old school'
    ],
    'abstract': [
      'abstract', 'geometric', 'pattern', 'colorful', 'modern art', 'non-representational', 
      'contemporary', 'minimalist', 'conceptual', 'surreal', 'expressionist', 'cubist',
      'abstract art', 'shapes', 'lines', 'asymmetrical', 'non-objective', 'experimental',
      'color field', 'composition'
    ],
    'animals': [
      'animal', 'cat', 'dog', 'bird', 'pet', 'wildlife', 'lion', 'tiger', 'elephant', 'zebra',
      'bear', 'wolf', 'fox', 'deer', 'horse', 'monkey', 'penguin', 'fish', 'shark', 'whale',
      'dolphin', 'reptile', 'snake', 'lizard', 'turtle', 'insect', 'butterfly', 'zoo', 'farm animal',
      'wildlife photography', 'natural habitat', 'safari', 'wild animal', 'animal photography', 
      'animal portrait', 'animal in nature', 'fauna', 'species', 'mammal', 'predator', 'endangered', 
      'conservation', 'birdwatching', 'animal behavior', 'animal close-up', 'animal in wild'
    ],
    'fashion': [
      'fashion', 'clothing', 'outfit', 'dress', 'apparel', 'clothes', 'garment',
      'accessory', 'jewelry', 'hat', 'shoes', 'bag', 'design', 'designer', 'runway', 'collection',
      'trend', 'couture', 'fashion photography', 'fashion model', 'chic', 'stylish', 'trendy',
      'vogue', 'fashionable', 'attire', 'wear', 'wardrobe', 'ensemble', 'fashion shoot', 'look',
      'fashion photography', 'fashion photo', 'fashionista', 'jacket', 'coat', 'suit', 'pants',
      'skirt', 'blouse', 'shirt', 'lingerie', 'jeans', 'denim', 'haute couture', 'casual wear',
      'fashion show', 'catwalk', 'fashion design', 'fashion industry', 'fashion week', 
      'model', 'photoshoot', 'studio', 'editorial', 'fashion editorial', 'fashion magazine',
      'fashion brand', 'boutique', 'elegant', 'luxury'
    ]
  };
  
  // 카테고리별 가중치 설정 (일부 카테고리의 우선순위를 높임)
  const categoryWeights: Record<string, number> = {
    'vintage': 2.0,   // vintage 카테고리의 가중치를 가장 높게 설정
    'anime': 1.8,     // anime 카테고리의 가중치를 높게 설정
    'animals': 1.8,   // animals 카테고리의 가중치를 높게 설정
    'fashion': 1.3,   // fashion 카테고리의 가중치
    'portrait': 0.85, // portrait 카테고리의 가중치를 더 낮춤
    'sci-fi': 1.5,    // sci-fi 카테고리 가중치 높임
    'landscape': 1.0,
    'urban': 1.0,
    'fantasy': 1.0,
    'abstract': 1.0
  };
  
  // 프롬프트가 있는 경우 분석
  if (prompt) {
    // 프롬프트 소문자 변환
    const lowerPrompt = prompt.toLowerCase();
    
    // 카테고리별 키워드 매칭 점수
    const scores: Record<string, number> = {};
    
    // 초기화
    Object.keys(categoryKeywords).forEach(category => {
      scores[category] = 0;
    });
    
    // 각 카테고리별 매칭 점수 계산
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        // 정확한 단어 매칭 (앞뒤에 공백이나 구두점이 있는 경우)
        const regex = new RegExp(`(^|\\s|[.,!?;])${keyword}(\\s|[.,!?;]|$)`, 'i');
        if (regex.test(lowerPrompt)) {
          scores[category] += 2; // 정확한 매칭에는 더 높은 점수
        } 
        // 부분 문자열 매칭
        else if (lowerPrompt.includes(keyword)) {
          scores[category] += 1;
        }
      });

      // 가중치 적용
      scores[category] *= categoryWeights[category] || 1.0;
    });
    
    // 특수 케이스 처리: 'fashion photography'나 'fashion shoot' 같은 명확한 패션 관련 구문이 있으면 가중치 추가
    const fashionPhrases = ['fashion photography', 'fashion shoot', 'fashion model', 'fashion design', 
                          'fashion show', 'fashion editorial', 'high fashion', 'fashion week',
                          'fashion studio', 'fashion brand', 'fashion designer'];
    
    for (const phrase of fashionPhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['fashion'] += 5; // 명확한 패션 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // vintage 관련 구문에 특별 가중치 부여
    const vintagePhrases = ['vintage photograph', 'sepia toned', 'old photograph', 'vintage photo', 
                         'retro style', 'vintage style', 'ancient photo', 'historical image',
                         'old time photo', 'antique photo', 'aged photograph', 'vintage look'];
                         
    for (const phrase of vintagePhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['vintage'] += 5; // 명확한 vintage 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // anime 관련 구문에 특별 가중치 부여
    const animePhrases = ['anime style', 'animation style', 'cartoon style', 'manga style', 
                        'anime character', 'animated character', 'anime art', 'japanese animation',
                        'anime portrait', 'animated portrait', 'cartoon art', 'manga art',
                        '2D illustration', 'anime illustration', 'digital illustration'];
                         
    for (const phrase of animePhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['anime'] += 5; // 명확한 anime 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // animals 관련 구문에 특별 가중치 부여
    const animalPhrases = ['wildlife photography', 'animal photography', 'natural habitat', 
                         'wild animal', 'zoo animal', 'safari', 'animal portrait', 'animal in nature',
                         'endangered species', 'animal close-up', 'pet photography', 'animal behavior'];
                         
    for (const phrase of animalPhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['animals'] += 5; // 명확한 animals 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // sci-fi 관련 구문에 특별 가중치 부여
    const scifiPhrases = ['science fiction', 'sci-fi scene', 'futuristic city', 'space station', 
                         'alien planet', 'cyberpunk', 'cyber city', 'futuristic technology',
                         'space colony', 'space exploration', 'dystopian future', 'futuristic world',
                         'advanced technology', 'space travel', 'space war', 'future society'];
                         
    for (const phrase of scifiPhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['sci-fi'] += 5; // 명확한 sci-fi 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // 가장 높은 점수를 가진 카테고리 찾기
    let bestCategory = '';
    let highestScore = 0;
    
    Object.entries(scores).forEach(([category, score]) => {
      if (score > highestScore) {
        highestScore = score;
          bestCategory = category;
      }
    });
    
    // 디버깅: 모든 카테고리 점수 기록
    console.log('[카테고리 분석 점수]', Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, score]) => `${cat}: ${score.toFixed(1)}`)
      .join(', '));
    
    // 점수가 0보다 크면 프롬프트 기반 카테고리 반환
    if (highestScore > 0) {
      console.log(`[카테고리 결정] 프롬프트: "${prompt.substring(0, 50)}...", 카테고리: ${bestCategory}, 점수: ${highestScore.toFixed(1)}`);
      return bestCategory;
    }
  }
  
  // 스타일 기반 분류
  if (styleName) {
    const styleToCategory: Record<string, string> = {
      'portrait': 'portrait',
      'anime': 'anime', 
      'animation': 'anime',  // animation 스타일 명시적 추가
      'animated': 'anime',   // animated 스타일 추가
      'cartoon': 'anime',    // cartoon 스타일 추가
      'digital_illustration': 'anime', // digital_illustration 추가
      'manga': 'anime',      // manga 스타일 추가
      'realistic': 'portrait',
      'digital art': 'fantasy',
      'painting': 'landscape',
      'landscape': 'landscape',
      'urban': 'urban',
      'fantasy': 'fantasy',
      'sci-fi': 'sci-fi',
      'vintage': 'vintage',
      'retro': 'vintage',
      'sepia': 'vintage',
      'photograph style': 'vintage',
      'toned portrait': 'vintage',
      'vintage photograph': 'vintage',
      'vintage style': 'vintage',
      'old school': 'vintage',
      'antique': 'vintage',
      'classic': 'vintage',
      'old fashioned': 'vintage',
      'abstract': 'abstract',
      'animals': 'animals',
      'wildlife': 'animals',        // wildlife 스타일 추가
      'wildlife photography': 'animals', // wildlife photography 추가
      'natural habitat': 'animals', // natural habitat 추가
      'animal photography': 'animals', // animal photography 추가
      'safari': 'animals',          // safari 스타일 추가
      'nature photography': 'animals', // nature photography가 동물 관련일 경우
      'macro': 'animals',           // 매크로 촬영(곤충, 작은 동물)
      'pet': 'animals',             // 애완동물 스타일
      'highfashion': 'fashion',
      'fashion': 'fashion',
      'studio': 'fashion',   // studio는 종종 fashion 촬영과 관련됨
      'editorial': 'fashion', // editorial도 fashion으로 분류
      'lookbook': 'fashion',  // lookbook 추가
    };
    
    // 정확한 매치 확인
    const lowerStyle = styleName.toLowerCase();
    if (styleToCategory[lowerStyle]) {
      console.log(`[카테고리 결정-스타일] 스타일: "${styleName}", 카테고리: ${styleToCategory[lowerStyle]}`);
      return styleToCategory[lowerStyle];
    }
    
    // 부분 매치 확인
    for (const [key, value] of Object.entries(styleToCategory)) {
      if (lowerStyle.includes(key.toLowerCase())) {
        console.log(`[카테고리 결정-스타일 부분매치] 스타일: "${styleName}", 매치: "${key}", 카테고리: ${value}`);
        return value;
      }
    }
  }
  
  // 기본값 - 사용자가 선택한 카테고리 또는 "portrait"
  return 'portrait';
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

// API 라우트 핸들러
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let imageUrl: string | null = null;
    let userId: string | null = null;
    let generationId: string | null = null;
    let prompt: string | null = null;
    let negative_prompt: string | null = null;
    let styleName: string | null = null;
    let showOnCommunity: boolean = true;
    let category: string | null = null;
    let userName: string | null = null;
    let aspectRatio: string | null = null;

    // Clerk 인증 정보 가져오기
    const clerkUser = await currentUser();
    const clerkUserId = clerkUser?.id || '';
    
    // Clerk에서 사용자 이름 가져오기 (더 정확한 정보)
    if (clerkUser?.id) {
      try {
        // @ts-ignore: 타입 무시
        const user = await clerkClient.users.getUser(clerkUser.id);
        userName = user.firstName || 
                  user.username || 
                  (user.emailAddresses && user.emailAddresses[0]?.emailAddress) || 
                  '사용자';
      } catch (clerkError) {
        console.error('Clerk API 오류:', clerkError);
        userName = clerkUser.firstName || '사용자';
      }
    }
    
    // FormData 방식 처리
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      
      imageUrl = formData.get('image_url') as string;
      userId = formData.get('user_id') as string || clerkUserId;
      generationId = formData.get('generation_id') as string;
      prompt = formData.get('prompt') as string;
      negative_prompt = formData.get('negative_prompt') as string;
      styleName = formData.get('style_name') as string || formData.get('rendering_style') as string;
      
      // 커뮤니티 표시 여부 (기본값: true)
      const showOnCommunityStr = formData.get('show_on_community');
      showOnCommunity = showOnCommunityStr !== 'false' && showOnCommunityStr !== '0';
      
      // 사용자 이름이 제공되지 않으면 Clerk에서 가져온 이름 사용
      const formUserName = formData.get('user_name') as string || formData.get('userName') as string;
      if (!userName) {
        userName = formUserName || '사용자';
      }
      
      // 카테고리 (옵션)
      category = formData.get('category') as string;
      
      // 종횡비 (옵션)
      aspectRatio = formData.get('aspect_ratio') as string;
    } 
    // JSON 방식 처리 (application/json)
    else if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      
      imageUrl = jsonData.image_url || jsonData.imageUrl;
      userId = jsonData.user_id || jsonData.userId || clerkUserId;
      generationId = jsonData.generation_id || jsonData.generationId;
      prompt = jsonData.prompt;
      negative_prompt = jsonData.negative_prompt || jsonData.negativePrompt;
      styleName = jsonData.style_name || jsonData.styleName || jsonData.rendering_style || jsonData.renderingStyle;
      
      // 커뮤니티 표시 여부 (기본값: true)
      showOnCommunity = jsonData.show_on_community !== false && jsonData.showOnCommunity !== false;
      
      // 사용자 이름이 제공되지 않으면 Clerk에서 가져온 이름 사용
      if (!userName) {
        userName = jsonData.user_name || jsonData.userName || '사용자';
      }
      
      // 카테고리 (옵션)
      category = jsonData.category;
      
      // 종횡비 (옵션)
      aspectRatio = jsonData.aspect_ratio || jsonData.aspectRatio;
    }
    else {
      return NextResponse.json({ 
        success: false, 
        error: `지원하지 않는 Content-Type: ${contentType}. "multipart/form-data" 또는 "application/json"을 사용하세요.`
      }, { status: 400 });
    }
    
    // 이미지 URL이 없는 경우 오류 반환
    if (!imageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: "이미지 URL이 제공되지 않았습니다. image_url 필드는 필수입니다."
      }, { status: 400 });
    }
    
    // 카테고리가 없는 경우 스타일과 프롬프트로 추론
    if (!category && (styleName || prompt)) {
      category = getCategoryFromPrompt(prompt, styleName);
    }
    
    // 이미지를 공유 테이블에 저장
    try {
      // 카테고리 최종 확인 (없으면 기본값)
      category = category || 'portrait';
      
      // 1. shared_images 테이블에 저장
      const { data: sharedImage, error: insertError } = await supabase
        .from('shared_images')
        .insert({
          user_id: userId,
          user_name: userName,
          image_url: imageUrl,
          prompt,
          aspect_ratio: aspectRatio || '1:1',
          category,
          show_on_community: showOnCommunity,
          original_generation_id: generationId
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('이미지 공유 중 오류:', insertError);
        return NextResponse.json({ 
          success: false, 
          error: "이미지 공유 중 오류가 발생했습니다: " + insertError.message
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          id: sharedImage.id,
          url: imageUrl,
          userId,
          showOnCommunity
        },
        message: '이미지가 성공적으로 공유되었습니다.'
      });
    } catch (dbError) {
      return NextResponse.json({ 
        success: false, 
        error: "이미지 공유 중 오류가 발생했습니다: " + dbError
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "요청 처리 중 오류가 발생했습니다: " + error
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