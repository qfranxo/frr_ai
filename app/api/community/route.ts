import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '@/lib/supabase';
import { eq, desc } from 'drizzle-orm';
import { generations } from '@/db/migrations/schema';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';

// Supabase 클라이언트 초기화
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

// 공유 이미지 타입 정의
interface SharedImage {
  id: string;
  userId: string;
  userName?: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  renderingStyle: string;
  gender: string;
  age: string;
  category: string;
  createdAt: string;
  likes?: number;
  comments?: Comment[];
  isLiked?: boolean;
  originalGenerationId?: string | null;
}

// 댓글 타입 정의
interface Comment {
  id: string;
  imageId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// 파일 시스템을 사용한 영구 저장 구현 (Supabase가 설정되지 않은 경우 폴백으로 사용)
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'shared-images.json');

// 디렉토리 존재 확인 및 생성
function ensureDirectoryExists() {
  const dir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 초기 데이터
const initialSharedImages: SharedImage[] = [];

// 파일에서 데이터 읽기
function readSharedImages(): SharedImage[] {
  try {
    ensureDirectoryExists();
    
    if (!fs.existsSync(DATA_FILE_PATH)) {
      // 파일이 없으면 초기 데이터로 생성
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(initialSharedImages, null, 2), 'utf8');
      return initialSharedImages;
    }
    
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading shared images data:', error);
    return initialSharedImages;
  }
}

// 파일에 데이터 저장
function saveSharedImages(data: SharedImage[]): boolean {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving shared images data:', error);
    return false;
  }
}

// 메모리 캐시 (성능 향상)
let sharedImagesCache: SharedImage[] | null = null;

// 캐시 무효화 함수 강화
function invalidateCache() {
  console.log("명시적으로 shared images 캐시 무효화");
  sharedImagesCache = null;
  // 강제로 다음 요청에서 새로운 데이터를 가져오도록 함
  process.env.NEXT_CACHE_REVALIDATION_TIME = Date.now().toString();
}

// 이미지 URL 유효성 확인 함수 추가
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http') && url.length > 10;
}

// Replicate URL 확인 함수
function isReplicateUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('replicate.delivery');
}

// 공유 이미지 데이터 가져오기
async function getSharedImages(): Promise<SharedImage[]> {
  try {
    // 캐시 무효화 요청이 있을 경우 무조건 캐시 삭제
    let forceRefresh = false;
    try {
      // URL.searchParams 접근 오류 방지
      if (process.env.NEXT_PUBLIC_REQUEST_URL) {
        const url = new URL(process.env.NEXT_PUBLIC_REQUEST_URL);
        forceRefresh = url.searchParams.has('force_refresh');
        
        if (forceRefresh) {
          console.log("Force refresh 파라미터 감지됨 - 캐시 초기화");
          invalidateCache();
        }
      }
    } catch (urlError) {
      console.warn("URL 파싱 중 오류 발생:", urlError);
      // URL 파싱 오류가 발생해도 계속 진행
    }

    // 캐시된 데이터가 있으면 반환 (단, 30초 이내 데이터만)
    const cacheTime = parseInt(process.env.NEXT_CACHE_REVALIDATION_TIME || '0');
    const isCacheValid = cacheTime > 0 && (Date.now() - cacheTime) < 30000;
    
    if (sharedImagesCache !== null && isCacheValid && !forceRefresh) {
      console.log("유효한 캐시된 shared images 데이터 사용 중");
      return sharedImagesCache;
    }

    console.log("캐시가 없거나 만료됨 - 새 데이터 로드");
    process.env.NEXT_CACHE_REVALIDATION_TIME = Date.now().toString();

    // Supabase에서 이미지 데이터 가져오기 시도
    let supabaseImages: SharedImage[] = [];
    
    try {
      console.log("Supabase 연결 시도 중...");
      
      // 1. 이미지 데이터 가져오기
      const { data: imagesData, error: imagesError } = await supabaseClient
        .from('shared_images')
        .select(`
          id,
          prompt,
          user_id,
          image_url,
          category,
          rendering_style,
          aspect_ratio,
          created_at,
          likes,
          comments,
          userName,
          gender,
          age,
          original_generation_id
        `)
        .order('created_at', { ascending: false });
      
      if (imagesError) {
        console.error("Supabase 이미지 가져오기 오류:", imagesError);
        return getLocalSharedImages();
      }
      
      if (imagesData && imagesData.length > 0) {
        console.log(`Supabase에서 ${imagesData.length}개 이미지 찾음`);
        
        // 기본 이미지 데이터 매핑
        supabaseImages = imagesData.map(image => ({
          id: image.id,
          userId: image.user_id,
          userName: image.userName || "사용자",
          imageUrl: image.image_url,
          prompt: image.prompt || "",
          aspectRatio: image.aspect_ratio || "1:1",
          renderingStyle: image.rendering_style || "natural",
          gender: image.gender || "neutral",
          age: image.age || "adult",
          category: image.category || "other",
          createdAt: image.created_at || new Date().toISOString(),
          originalGenerationId: image.original_generation_id || null,
          likes: image.likes || 0,
          comments: []
        }));
        
        // 2. 댓글 데이터 가져오기
        const { data: commentsData, error: commentsError } = await supabaseClient
          .from('comments')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (commentsError) {
          console.error('Supabase 댓글 가져오기 오류:', commentsError);
        } else if (commentsData && commentsData.length > 0) {
          console.log(`Supabase에서 ${commentsData.length}개 댓글 찾음`);
          
          // 이미지 ID별로 댓글 그룹화
          const commentsByImageId: Record<string, Comment[]> = {};
          
          commentsData.forEach(comment => {
            const imageId = comment.image_id;
            
            if (!commentsByImageId[imageId]) {
              commentsByImageId[imageId] = [];
            }
            
            commentsByImageId[imageId].push({
              id: comment.id,
              imageId: `shared-${imageId}`,
              userId: comment.user_id,
              userName: comment.user_name || 'Anonymous User',
              text: comment.content, // content 필드를 text로 매핑
              createdAt: comment.created_at
            });
          });
          
          // 각 이미지에 댓글 연결
          supabaseImages.forEach(image => {
            image.comments = commentsByImageId[image.id] || [];
          });
        }
      }
    } catch (error) {
      console.error('Supabase 데이터 가져오기 오류:', error);
      return getLocalSharedImages();
    }

    // 데이터를 가져왔다면 캐시 및 반환
    if (supabaseImages.length > 0) {
      console.log(`Supabase에서 ${supabaseImages.length}개 이미지 반환 중`);
      sharedImagesCache = supabaseImages;
      return supabaseImages;
    }
    
    // 로컬 DB에서 이미지 데이터 가져오기 시도 (Drizzle)
    try {
      console.log("로컬 DB에서 이미지 로드 중 (generations 테이블)...");
      
      const generationsData = await db.select()
        .from(generations)
        .where(eq(generations.isShared, true))
        .orderBy(desc(generations.createdAt));
      
      if (generationsData && generationsData.length > 0) {
        console.log(`로컬 DB에서 ${generationsData.length}개 공유 이미지 찾음`);
        
        // DB 데이터를 SharedImage 형식으로 변환
        const localDbImages: SharedImage[] = generationsData.map(image => ({
          id: image.id,
          userId: image.userId || 'unknown',
          userName: image.userName || '사용자',
          imageUrl: image.imageUrl,
          prompt: image.prompt || '',
          aspectRatio: image.aspectRatio || '1:1',
          renderingStyle: image.renderingStyle || '',
          gender: image.gender || '',
          age: image.age || '',
          category: categorizeImage(image.prompt || '', image.renderingStyle || ''),
          createdAt: image.createdAt?.toISOString() || new Date().toISOString(),
          likes: 0,
          comments: []
        }));
        
        console.log(`로컬 DB에서 ${localDbImages.length}개 이미지 반환 중`);
        sharedImagesCache = localDbImages;
        return localDbImages;
      }
    } catch (dbErr) {
      console.error('로컬 DB 조회 오류:', dbErr);
    }
    
    // 로컬 파일 시스템에서 이미지 가져오기 (최후의 수단)
    console.log("파일 시스템 스토리지로 폴백...");
    const fileSystemImages = getLocalSharedImages();
    
    console.log(`파일 시스템에서 ${fileSystemImages.length}개 이미지 반환 중`);
    sharedImagesCache = fileSystemImages;
    return fileSystemImages;
  } catch (error) {
    console.error('이미지 가져오기 오류:', error);
    return getLocalSharedImages();
  }
}

// 로컬 스토리지에서 데이터 가져오기 (폴백)
function getLocalSharedImages(): SharedImage[] {
  if (!sharedImagesCache) {
    sharedImagesCache = readSharedImages();
  }
  return sharedImagesCache || [];
}

// 새 이미지 추가
async function addSharedImage(newImage: SharedImage): Promise<SharedImage> {
  try {
    console.log("addSharedImage called with:", {
      id: newImage.id,
      imageUrl: newImage.imageUrl ? newImage.imageUrl.substring(0, 30) + "..." : "Missing URL",
      category: newImage.category
    });
    
    // Supabase에 저장 시도
    console.log("Attempting to save to Supabase...");
    const { data, error } = await supabaseClient
      .from('shared_images')
      .insert([
        {
          prompt: newImage.prompt,
          image_url: newImage.imageUrl,
          user_id: newImage.userId,
          category: newImage.category,
          rendering_style: newImage.renderingStyle,
          aspect_ratio: newImage.aspectRatio,
          likes: [],
          comments: []
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      // 에러 발생 시 파일 시스템에 저장
      console.log("Falling back to local storage due to Supabase error");
      return addLocalSharedImage(newImage);
    }
    
    console.log("Successfully saved to Supabase:", data?.id);
    
    // 캐시 무효화 - 새 이미지가 바로 보이도록
    invalidateCache();
    
    // 데이터를 올바른 형식으로 변환
    const formattedData: SharedImage = {
      id: data.id,
      userId: data.user_id,
      userName: data.userName || newImage.userName,
      imageUrl: data.image_url || newImage.imageUrl,
      prompt: data.prompt || newImage.prompt,
      aspectRatio: data.aspect_ratio || newImage.aspectRatio,
      renderingStyle: data.rendering_style || newImage.renderingStyle,
      gender: data.gender || newImage.gender,
      age: data.age || newImage.age,
      category: data.category || newImage.category,
      createdAt: data.created_at || newImage.createdAt,
      likes: data.likes || 0,
      comments: [],
      originalGenerationId: data.original_generation_id || null
    };
    
    return formattedData;
  } catch (error) {
    console.error('Error adding shared image:', error instanceof Error ? error.message : String(error));
    console.log("Falling back to local storage due to exception");
    return addLocalSharedImage(newImage);
  }
}

// 로컬 스토리지에 이미지 추가 (폴백)
function addLocalSharedImage(newImage: SharedImage): SharedImage {
  console.log("addLocalSharedImage called as fallback");
  const images = getLocalSharedImages();
  // 좋아요와 댓글 초기화
  newImage.likes = 0;
  newImage.comments = [];
  
  images.unshift(newImage); // 최신 이미지를 앞에 추가
  
  // 데이터 크기 제한 (선택 사항)
  if (images.length > 100) {
    images.pop();
  }
  
  // 캐시 무효화 (중요: 새 이미지가 바로 표시되도록)
  invalidateCache();
  
  // 캐시 및 파일 업데이트
  sharedImagesCache = images;
  const saveSuccess = saveSharedImages(images);
  console.log("Local storage save result:", saveSuccess ? "Success" : "Failed");
  return newImage;
}

// 좋아요 추가/삭제
async function toggleLike(imageId: string, userId: string, isLiked: boolean) {
  try {
    console.log(`좋아요 토글: image=${imageId}, user=${userId}, isLiked=${isLiked}`);
    
    // "shared-" 접두사 제거
    const pureImageId = imageId.replace('shared-', '');
    
    // Supabase 클라이언트에 사용자 ID 설정 (RLS 정책용)
    await supabaseClient.rpc('set_current_user_id', { user_id: userId });
    
    // 이미지 조회
    const { data: existingImage, error: getError } = await supabaseClient
      .from('shared_images')
      .select('id, likes')
      .eq('id', pureImageId)
      .single();
    
    if (getError) {
      console.error('이미지 조회 오류:', getError);
      return toggleLocalLike(imageId, isLiked);
    }
    
    // 좋아요 배열 처리
    let likes = Array.isArray(existingImage.likes) ? [...existingImage.likes] : [];
    
    if (isLiked) {
      // 좋아요 취소
      likes = likes.filter(id => id !== userId);
    } else {
      // 좋아요 추가
      if (!likes.includes(userId)) {
        likes.push(userId);
      }
    }
    
    // 이미지 업데이트
    const { data, error: updateError } = await supabaseClient
      .from('shared_images')
      .update({
        likes: likes
      })
      .eq('id', pureImageId);
    
    if (updateError) {
      console.error('이미지 업데이트 오류:', updateError);
      return toggleLocalLike(imageId, isLiked);
    }
    
    console.log(`좋아요 업데이트 완료: image=${pureImageId}, count=${likes.length}`);
    
    // 캐시 무효화
    invalidateCache();
    
    return true;
  } catch (error) {
    console.error('좋아요 토글 오류:', error);
    return toggleLocalLike(imageId, isLiked);
  }
}

// 로컬 저장소에서 좋아요 토글 (폴백)
function toggleLocalLike(imageId: string, isLiked: boolean): boolean {
  const images = getLocalSharedImages();
  const imageIndex = images.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) return false;
  
  // 좋아요 토글
  if (isLiked) {
    // 좋아요 취소 (1씩 감소)
    images[imageIndex].likes = (images[imageIndex].likes || 0) - 1;
  } else {
    // 좋아요 추가 (1씩 증가)
    images[imageIndex].likes = (images[imageIndex].likes || 0) + 1;
  }
  
  // 음수 방지
  if (images[imageIndex].likes! < 0) {
    images[imageIndex].likes = 0;
  }
  
  // 캐시 및 파일 업데이트
  sharedImagesCache = images;
  saveSharedImages(images);
  return true;
}

// 댓글 추가
async function addComment(imageId: string, userId: string, userName: string, text: string): Promise<Comment | null> {
  try {
    console.log("댓글 추가 요청:", { imageId, userId, userName, text });
    const createdAt = new Date().toISOString();
    
    // "shared-" 접두사 제거하여 순수 UUID 얻기
    const pureImageId = imageId.replace('shared-', '');
    
    // 요청한 사용자 ID 설정 (RLS 정책용)
    await supabaseClient.rpc('set_current_user_id', { user_id: userId });
    
    // Supabase에 댓글 추가 - 올바른 테이블과 필드 이름 사용
    const { data, error } = await supabaseClient
      .from('comments')
      .insert({
        image_id: pureImageId,  // image_id 필드
        user_id: userId,        // user_id
        content: text,          // text 필드를 content로 변경
        created_at: createdAt,
        user_name: userName     // user_name 저장
      })
      .select()
      .single();
    
    console.log("Supabase 댓글 추가 결과:", { data, error });
    
    if (error) {
      console.error('Supabase error:', error);
      // 에러 발생 시 로컬 저장소에 저장
      return addLocalComment(imageId, userId, userName, text);
    }
    
    // 클라이언트 측에서 기대하는 형식으로 데이터 반환
    return {
      id: data.id,
      imageId: imageId,
      userId: userId,
      userName: userName, // userName 포함
      text: data.content, // content 필드를 text로 변환
      createdAt: createdAt
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return addLocalComment(imageId, userId, userName, text);
  }
}

// 로컬 저장소에 댓글 추가 (폴백)
function addLocalComment(imageId: string, userId: string, userName: string, text: string): Comment | null {
  const images = getLocalSharedImages();
  const imageIndex = images.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) return null;
  
  const newComment: Comment = {
    id: uuidv4(), // 여기도 UUID로 변경
    imageId,
    userId,
    userName,
    text,
    createdAt: new Date().toISOString()
  };
  
  // 댓글 배열이 없으면 생성
  if (!images[imageIndex].comments) {
    images[imageIndex].comments = [];
  }
  
  // 댓글 추가
  images[imageIndex].comments!.push(newComment);
  
  // 캐시 및 파일 업데이트
  sharedImagesCache = images;
  saveSharedImages(images);
  return newComment;
}

// 카테고리 자동 분류 함수
function categorizeImage(prompt: string, renderingStyle: string): string {
  const promptLower = prompt.toLowerCase();
  
  // 키워드 우선순위를 조정하여 sci-fi와 vintage가 먼저 감지되도록 함
  if (promptLower.includes('sci-fi') || promptLower.includes('future') || promptLower.includes('space') || 
      promptLower.includes('futuristic') || promptLower.includes('cyber') || promptLower.includes('robot') || 
      promptLower.includes('alien') || promptLower.includes('spaceship')) {
    return 'sci-fi';
  } else if (promptLower.includes('vintage') || promptLower.includes('retro') || promptLower.includes('old style') || 
            promptLower.includes('old photo') || promptLower.includes('1950') || promptLower.includes('1960') || 
            promptLower.includes('1970') || promptLower.includes('1980') || promptLower.includes('classic')) {
    return 'vintage';
  } else if (promptLower.includes('anime') || promptLower.includes('cartoon') || renderingStyle === 'anime') {
    return 'anime';
  } else if (promptLower.includes('fantasy') || promptLower.includes('magical') || promptLower.includes('dragon')) {
    return 'fantasy';
  } else if (promptLower.includes('fashion') || promptLower.includes('model') || promptLower.includes('runway') || 
             promptLower.includes('vogue') || promptLower.includes('style') || promptLower.includes('luxury') || 
             promptLower.includes('editorial') || promptLower.includes('high fashion') || promptLower.includes('photoshoot')) {
    return 'fashion';
  } else if (promptLower.includes('portrait') || promptLower.includes('face') || promptLower.includes('person')) {
    return 'portrait';
  } else if (promptLower.includes('landscape') || promptLower.includes('nature') || promptLower.includes('scenery')) {
    return 'landscape';
  } else if (promptLower.includes('city') || promptLower.includes('urban') || promptLower.includes('architecture')) {
    return 'urban';
  } else if (promptLower.includes('animal') || promptLower.includes('wildlife') || promptLower.includes('pet')) {
    return 'animals';
  } else if (promptLower.includes('abstract') || promptLower.includes('conceptual')) {
    return 'abstract';
  }
  
  // 렌더링 스타일 기반 추가 판단
  if (renderingStyle) {
    const renderingStyleLower = renderingStyle.toLowerCase();
    
    // 렌더링 스타일을 카테고리에 매핑
    const styleToCategory: { [key: string]: string } = {
      'futuristic': 'sci-fi',
      'retro': 'vintage',
      'anime': 'anime',
      'fantasy': 'fantasy',
      'realistic': 'portrait',
      'digital_illustration': 'anime',
      'digital_illustration/pixel_art': 'anime',
      'digital_illustration/hand_drawn': 'anime',
      'digital_illustration/infantile_sketch': 'anime',
      'realistic_image': 'portrait',
      'realistic_image/studio_portrait': 'portrait',
      'realistic_image/natural_light': 'portrait',
      'highfashion': 'fashion',
      'high fashion': 'fashion',
      'fashion': 'fashion',
      'luxury': 'fashion',
      'photofashion': 'fashion',
      'vogue': 'fashion',
      'runway': 'fashion',
      'modeling': 'fashion',
      'editorial': 'fashion',
      'other': 'other'
    };
    
    // 정확한 매칭 먼저 시도
    if (styleToCategory[renderingStyleLower]) {
      return styleToCategory[renderingStyleLower];
    }
    
    // 부분 매칭으로 카테고리 찾기
    for (const [style, category] of Object.entries(styleToCategory)) {
      if (renderingStyleLower.includes(style)) {
        return category;
      }
    }
  }
  
  // 기본 카테고리를 'other'로 변경
  return 'other';
}

// 간소화된 커뮤니티 API
export async function GET(request: Request) {
  try {
    console.log('Community API 요청 받음');
    
    // Supabase 연결 상태 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase 설정 누락됨, 로컬 데이터 사용');
      const localData = getLocalSharedImages();
      return NextResponse.json({ success: true, data: localData });
    }
    
    // 현재 로그인한 사용자 정보 가져오기
    const authInfo = await auth();
    const userId = authInfo?.userId;
    
    // Supabase에서 공유된 이미지 가져오기
    try {
      console.log('Supabase에서 이미지 데이터 조회 시작');
      
      // 모든 이미지 가져오기 (필터링 제거)
      const { data: sharedImages, error } = await supabase
        .from('shared_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase 조회 오류:', error);
        throw error;
      }
      
      if (!sharedImages || sharedImages.length === 0) {
        console.log('Supabase에 데이터 없음, 샘플 데이터 반환');
        return NextResponse.json({ success: true, data: initialSharedImages });
      }
      
      console.log(`Supabase에서 ${sharedImages.length}개 이미지 조회됨`);

      // 현재 로그인한 사용자가 좋아요한 이미지 ID 목록 가져오기
      const liked: Record<string, boolean> = {};
      
      if (userId) {
        try {
          const { data: likedData, error: likedError } = await supabase
            .from('user_likes')
            .select('image_id')
            .eq('user_id', userId);
          
          if (!likedError && likedData) {
            likedData.forEach(item => {
              if (item.image_id) {
                liked[item.image_id] = true;
              }
            });
          }
        } catch (likeError) {
          console.error('좋아요 데이터 조회 오류:', likeError);
        }
      }

      // 이미지 데이터 포맷팅
      const formattedData = sharedImages.map(image => {
        // 2. 이미지 URL 확인 및 보정
        let imageUrl = image.image_url || '';

        if (!imageUrl) {
          imageUrl = '/fallback-image.png'; // 이미지 URL이 없는 경우
        } else if (isReplicateUrl(imageUrl)) {
          // Replicate URL 그대로 사용 (자동 저장 기능이 처리)
          console.log(`Replicate URL 발견, 원본 URL 사용: ID=${image.id}`);
        } else if (!isValidImageUrl(imageUrl)) {
          console.log(`유효하지 않은 URL: ID=${image.id}`);
          imageUrl = '/fallback-image.png'; // 유효하지 않은 URL 경우
        }
        
        return {
          id: image.id,
          userId: image.user_id,
          userName: image.user_name,
          imageUrl: imageUrl,
          prompt: image.prompt,
          aspectRatio: image.aspect_ratio || '1:1',
          renderingStyle: image.rendering_style,
          gender: image.gender,
          age: image.age,
          category: image.category || 'portrait',
          createdAt: image.created_at,
          likes: (image.likes || []).length,
          isLiked: userId ? liked[image.id] || false : false,
          comments: [],
          originalGenerationId: image.original_generation_id || null
        };
      });
      
      return NextResponse.json({ success: true, data: formattedData });
    } catch (error: any) {
      console.error('Supabase 데이터 조회 실패:', error);
      console.error('에러 상세 정보:', JSON.stringify({
        message: error.message,
        name: error.name,
        cause: error.cause
      }));
      
      // Supabase 오류 시 로컬 데이터 반환
      console.log('로컬 데이터로 폴백');
      const localData = getLocalSharedImages();
      return NextResponse.json({ 
        success: true, 
        data: localData,
        error: 'Supabase 조회 실패, 로컬 데이터 반환됨'
      });
    }
  } catch (error: any) {
    console.error('Community API 오류:', error);
    console.error('스택 트레이스:', error.stack || '스택 없음');
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error',
      details: error.stack || null
    }, { status: 500 });
  }
}

// 사용자 생성 처리 - Supabase users 테이블에 직접 저장
async function handleUserCreated(userData: any) {
  try {
    // Clerk 사용자 데이터 추출
    const { id, email_addresses, username, first_name, last_name, image_url } = userData;
    
    // 필요한 데이터 추출
    const email = email_addresses?.[0]?.email_address || '';
    const name = first_name ? (last_name ? `${first_name} ${last_name}` : first_name) : (username || email.split('@')[0]);
    
    console.log('새 사용자 생성:', { id, email, name });
    
    // Supabase users 테이블에 직접 사용자 삽입 - 정확한 필드명 사용
    const { data, error } = await supabaseClient
      .from('users')
      .upsert([
        {
          id: id,
          email: email,
          name: name,
          profile_image: image_url,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'id' })
      .select();
    
    if (error) {
      console.error('Supabase users 테이블 삽입 오류:', error);
      throw error;
    }
    
    console.log('Supabase users 테이블에 사용자 저장 성공:', data?.[0]?.id);
    
    // 추가 처리가 필요한 경우 여기에 작성
  } catch (error) {
    console.error('handleUserCreated 오류:', error);
    throw error;
  }
}

// 사용자 업데이트 처리
async function handleUserUpdated(userData: any) {
  try {
    // Clerk 사용자 데이터 추출
    const { id, email_addresses, username, first_name, last_name, image_url } = userData;
    
    // 필요한 데이터 추출
    const email = email_addresses?.[0]?.email_address || '';
    const name = first_name ? (last_name ? `${first_name} ${last_name}` : first_name) : (username || email.split('@')[0]);
    
    console.log('사용자 업데이트:', { id, email, name });
    
    // Supabase users 테이블에 직접 사용자 업데이트 - 정확한 필드명 사용
    const { data, error } = await supabaseClient
      .from('users')
      .update({
        email: email,
        name: name,
        profile_image: image_url
        // updated_at 필드는 테이블에 없으므로 제거
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase users 테이블 업데이트 오류:', error);
      throw error;
    }
    
    console.log('Supabase users 테이블에 사용자 업데이트 성공:', data?.[0]?.id);
  } catch (error) {
    console.error('handleUserUpdated 오류:', error);
    throw error;
  }
}

// 사용자 삭제 처리
async function handleUserDeleted(userData: any) {
  try {
    const { id } = userData;
    
    console.log('사용자 삭제:', { id });
    
    // Supabase에서 사용자를 물리적으로 삭제
    const { data, error } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase users 테이블 사용자 삭제 오류:', error);
      throw error;
    }
    
    console.log('Supabase users 테이블에서 사용자 삭제 성공:', id);
  } catch (error) {
    console.error('handleUserDeleted 오류:', error);
    throw error;
  }
}

// 무거운 작업은 비동기로 처리하고 즉시 응답
async function processUserAsync(userData: any) {
  try {
    // 시간이 오래 걸리는 작업 수행
  } catch (error) {
    console.error('비동기 처리 오류:', error);
  }
}

// 게시물 업로드 API
export async function POST(request: Request) {
  try {
    console.log("커뮤니티 API POST 요청 시작");
    
    // Clerk에서 현재 인증 상태 가져오기 - 간소화된 방식
    const { userId } = await auth();
    
    if (!userId) {
      console.log("인증되지 않은 사용자: userId가 없음");
      return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
    }

    console.log("인증된 사용자:", userId);
    
    // Content-Type 확인
    const contentType = request.headers.get('content-type') || '';
    let requestData: any = {};

    // FormData 방식 처리 (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        requestData[key] = value;
      });
      console.log("FormData 방식 요청 처리");
    } 
    // JSON 방식 처리 (application/json)
    else if (contentType.includes('application/json')) {
      requestData = await request.json();
      console.log("JSON 방식 요청 처리");
    }
    // 지원하지 않는 Content-Type
    else {
      console.error('🔥 지원하지 않는 Content-Type:', contentType);
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported Content-Type. Use "multipart/form-data" or "application/json"' 
      }, { status: 400 });
    }

    // 필수 필드 추출 (다양한 키 이름 지원)
    const prompt = requestData.prompt;
    const imageUrl = requestData.imageUrl || requestData.image_url;
    const category = requestData.category || requestData.selectedCategory || 'other';
    const renderingStyle = requestData.renderingStyle || requestData.rendering_style || '';
    const aspectRatio = requestData.aspectRatio || requestData.aspect_ratio || '3:4';

    if (!prompt || !imageUrl) {
      console.error('🔥 필수 필드 누락:', { prompt, imageUrl });
      return NextResponse.json({ error: '프롬프트와 이미지 URL이 필요합니다' }, { status: 400 });
    }
    
    // 이미지 URL 유효성 검증
    if (!isValidImageUrl(imageUrl)) {
      console.error('🔥 유효하지 않은 이미지 URL:', imageUrl);
      return NextResponse.json({ 
        error: '유효하지 않은 이미지 URL입니다. 올바른 이미지 URL을 제공해주세요.',
        imageUrl: imageUrl
      }, { status: 400 });
    }
    
    console.log("게시물 데이터:", { prompt, imageUrl, category, renderingStyle, aspectRatio });

    // 테이블 구조 확인
    try {
      const { data: tableInfo, error: tableError } = await supabaseClient
        .from('shared_images')
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.error('🔥 테이블 구조 확인 오류:', {
          code: tableError.code,
          message: tableError.message,
          details: tableError.details
        });
        return NextResponse.json({ error: tableError.message }, { status: 500 });
      }
      
      // 필드명 확인
      let userIdField = 'user_id';
      if (tableInfo && tableInfo.length > 0) {
        const hasUserId = 'user_id' in tableInfo[0];
        const hasUserID = 'userId' in tableInfo[0];
        userIdField = hasUserId ? 'user_id' : (hasUserID ? 'userId' : 'user_id');
        console.log(`사용할 사용자 ID 필드명: ${userIdField}`);
      }

      // 동적으로 삽입 객체 생성 (image_url 사용)
      const insertData: Record<string, any> = {
        prompt,
        image_url: imageUrl, // imageUrl -> image_url로 변경
        category,
        rendering_style: renderingStyle, // renderingStyle -> rendering_style로 변경
        aspect_ratio: aspectRatio, // aspectRatio -> aspect_ratio로 변경
        likes: [],
        comments: [],
        created_at: new Date().toISOString(),
        shared: true // 항상 공유 상태로 설정
      };
      
      // 적절한 필드명으로 userId 설정
      insertData[userIdField] = userId;

      // Supabase에 게시물 저장
      console.log("Supabase에 게시물 저장 시도...", insertData);
      const { data: post, error } = await supabaseClient
        .from('shared_images')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('🔥 게시물 저장 오류:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("게시물 저장 성공:", post.id);
      
      // 페이지 재검증
      revalidatePath('/community');
      revalidatePath('/');

      return NextResponse.json({ success: true, post });
    } catch (dbError: any) {
      console.error('🔥 DB 저장 중 오류:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details
      });
      return NextResponse.json({ error: dbError.message || 'Database error' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('🔥 POST 요청 처리 오류:', error);
    console.error('🔥 오류 상세정보:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 모든 공유 이미지 삭제를 위한 DELETE 핸들러
export async function DELETE(request: Request) {
  try {
    // 1. Supabase 설정 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Supabase 설정 누락됨, 삭제 작업 불가');
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase 설정이 없어 삭제할 수 없습니다.' 
      }, { status: 500 });
    }
    
    console.log('모든 공유 이미지 삭제 작업 시작');
    
    // 2. Service Role Key로 Supabase 클라이언트 생성 (admin 권한)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 3. shared_images 테이블의 모든 데이터 삭제
    const { error } = await supabaseAdmin
      .from('shared_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제 (안전장치)
    
    if (error) {
      console.error('Supabase 데이터 삭제 오류:', error);
      return NextResponse.json({ 
        success: false, 
        error: '데이터 삭제 중 오류가 발생했습니다: ' + error.message 
      }, { status: 500 });
    }
    
    console.log('모든 공유 이미지가 성공적으로 삭제되었습니다');
    
    return NextResponse.json({ 
      success: true, 
      message: '모든 공유 이미지가 성공적으로 삭제되었습니다.' 
    });
    
  } catch (error: any) {
    console.error('Community API 삭제 오류:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error',
      details: error.stack || null
    }, { status: 500 });
  }
} 