import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '@/lib/supabase';
import { eq, desc } from 'drizzle-orm';
import { generations } from '@/db/migrations/schema';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
const initialSharedImages: SharedImage[] = [
  {
    id: 'mock-1',
    userId: 'business_style',
    imageUrl: 'https://replicate.delivery/pbxt/4EbhJzpPly8SWqRdiiM54NvUcyhhnDKkcL4D9H5HzWlKhbHjA/out-0.png',
    prompt: 'Professional female portrait with business attire and natural office lighting',
    aspectRatio: '1:1',
    renderingStyle: 'realistic',
    gender: 'female',
    age: '30',
    category: 'portrait',
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: [
      {
        id: 'comment-1',
        imageId: 'mock-1',
        userId: 'user123',
        userName: '마케터',
        text: '우리 브랜드와 잘 어울릴 것 같아요!',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ]
  },
  {
    id: 'mock-2',
    userId: 'daily_look',
    imageUrl: 'https://replicate.delivery/pbxt/0RUkJcPMsGqRAoiEJCpVCZjEwlTsWOwL9ZMOSs2gGwQm4VJjA/out-0.png',
    prompt: 'Young man in casual attire with black hat, natural daylight',
    aspectRatio: '1:1',
    renderingStyle: 'natural',
    gender: 'male',
    age: '25',
    category: 'portrait',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    likes: 0,
    comments: [
      {
        id: 'comment-2',
        imageId: 'mock-2',
        userId: 'user456',
        userName: '패션디자이너',
        text: '이 스타일 정말 트렌디하네요!',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'comment-3',
        imageId: 'mock-2',
        userId: 'user789',
        userName: '사진작가',
        text: '조명이 매우 자연스럽게 표현되었네요.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      }
    ]
  },
  {
    id: 'mock-3',
    userId: 'luxury_style',
    imageUrl: 'https://replicate.delivery/pbxt/Xacn3TuVIpVUjTVqkdoeoXw8UDqq8mWKG2jOXww5mf47gbE/out-0.png',
    prompt: 'Elegant female fashion portrait with luxurious styling, dramatic studio lighting',
    aspectRatio: '1:1',
    renderingStyle: 'high_fashion',
    gender: 'female',
    age: '27',
    category: 'portrait',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    likes: 0,
    comments: [
      {
        id: 'comment-4',
        imageId: 'mock-3',
        userId: 'user101',
        userName: '패션에디터',
        text: '럭셔리 브랜드 화보에 어울리는 분위기예요.',
        createdAt: new Date(Date.now() - 5000000).toISOString(),
      },
      {
        id: 'comment-5',
        imageId: 'mock-3',
        userId: 'user202',
        userName: '메이크업아티스트',
        text: '메이크업과 조명이 정말 완벽한 조합이네요!',
        createdAt: new Date(Date.now() - 3000000).toISOString(),
      },
      {
        id: 'comment-6',
        imageId: 'mock-3',
        userId: 'user303',
        userName: '스타일리스트',
        text: '이런 스타일 정말 좋아합니다.',
        createdAt: new Date(Date.now() - 2000000).toISOString(),
      }
    ]
  },
  {
    id: 'mock-4',
    userId: 'urban_explorer',
    imageUrl: 'https://replicate.delivery/pbxt/HPVJ4LQqpEGn21YkAkMmlGsL8BDEFkRxQsRnvBVATZWk8TXjA/out-0.png',
    prompt: 'Modern cityscape with futuristic skyscrapers and neon lighting',
    aspectRatio: '16:9',
    renderingStyle: 'artistic',
    gender: 'neutral',
    age: '35',
    category: 'urban',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    likes: 0,
    comments: []
  },
  {
    id: 'mock-5',
    userId: 'anime_artist',
    imageUrl: 'https://replicate.delivery/pbxt/Xd1ZmwKBdJxppZqR05K1b8F4gvVRrLW4iTBE1eN3Y7jkgbHjA/out-0.png',
    prompt: 'Anime style character with vibrant colors and fantasy background',
    aspectRatio: '1:1',
    renderingStyle: 'anime',
    gender: 'female',
    age: '20',
    category: 'anime',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    likes: 0,
    comments: []
  }
];

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
  return Boolean(url && url.startsWith('https://replicate.delivery/'));
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
      const { data: imagesData, error: imagesError } = await supabase
        .from('shared_images')
        .select('id, user_id, user_name, image_url, prompt, aspect_ratio, rendering_style, gender, age, category, created_at, like_count, likes, comments_count')
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
          userName: image.user_name || "사용자",
          imageUrl: image.image_url,
          prompt: image.prompt || "",
          aspectRatio: image.aspect_ratio || "1:1",
          renderingStyle: image.rendering_style || "natural",
          gender: image.gender || "neutral",
          age: image.age || "adult",
          category: image.category || "other",
          createdAt: image.created_at || new Date().toISOString(),
          likes: image.likes || image.like_count || 0,
          comments: []
        }));
        
        // 2. 댓글 데이터 가져오기
        const { data: commentsData, error: commentsError } = await supabase
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
    const { data, error } = await supabase
      .from('shared_images')
      .insert({
        id: newImage.id,
        user_id: newImage.userId,
        user_name: newImage.userName, // 사용자 이름도 저장
        image_url: newImage.imageUrl,
        prompt: newImage.prompt,
        aspect_ratio: newImage.aspectRatio,
        rendering_style: newImage.renderingStyle,
        gender: newImage.gender,
        age: newImage.age,
        category: newImage.category,
        created_at: newImage.createdAt,
        likes: 0
      })
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
      userId: data.user_id || newImage.userId,
      userName: data.user_name || newImage.userName,
      imageUrl: data.image_url || newImage.imageUrl,
      prompt: data.prompt || newImage.prompt,
      aspectRatio: data.aspect_ratio || newImage.aspectRatio,
      renderingStyle: data.rendering_style || newImage.renderingStyle,
      gender: data.gender || newImage.gender,
      age: data.age || newImage.age,
      category: data.category || newImage.category,
      createdAt: data.created_at || newImage.createdAt,
      likes: data.likes || 0,
      comments: []
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
async function toggleLike(imageId: string, userId: string, isLiked: boolean, increment: number = 1): Promise<boolean> {
  try {
    console.log(`Toggling like: imageId=${imageId}, userId=${userId}, isLiked=${isLiked}, increment=${increment}`);
    
    // 접두사 제거하여 순수 ID 얻기
    const pureImageId = imageId.replace('shared-', '');
    
    // 요청한 사용자 ID 설정 (RLS 정책용)
    await supabase.rpc('set_current_user_id', { user_id: userId });
    
    // 1. 좋아요 상태 처리 
    if (isLiked) {
      // 좋아요 삭제
      console.log(`Removing like for image ${pureImageId} by user ${userId}`);
      const { error: likeError } = await supabase
        .from('likes')
        .delete()
        .match({ image_id: pureImageId, user_id: userId });
      
      if (likeError) {
        console.error('Error removing like record:', likeError);
      }
    } else {
      // 좋아요 추가 - 중복 체크 없이 바로 추가
      console.log(`Adding like for image ${pureImageId} by user ${userId}`);
      const { error: likeError } = await supabase
        .from('likes')
        .insert({ 
          image_id: pureImageId, 
          user_id: userId 
        });
      
      if (likeError) {
        console.error('Error adding like record:', likeError);
      }
    }
    
    // 2. 좋아요 수 업데이트 - 현재 숫자를 직접 가져와서 증감
    const { count, error: countError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('image_id', pureImageId);
    
    if (countError) {
      console.error('Error counting likes:', countError);
      return toggleLocalLike(imageId, isLiked, increment);
    }
    
    // 좋아요 수 업데이트
    const currentCount = count || 0;
    console.log(`Current like count for image ${pureImageId}: ${currentCount}`);
    
    const { error: updateError } = await supabase
      .from('shared_images')
      .update({ 
        likes: currentCount,
        like_count: currentCount
      })
      .eq('id', pureImageId);
    
    if (updateError) {
      console.error('Error updating like count:', updateError);
      return toggleLocalLike(imageId, isLiked, increment);
    }
    
    console.log(`Like count updated for image ${pureImageId}: ${currentCount}`);
    
    // 캐시 무효화 - 좋아요 상태가 변경되었으므로 항상 캐시 무효화
    invalidateCache();
    
    return true;
  } catch (error) {
    console.error('Error toggling like:', error);
    return toggleLocalLike(imageId, isLiked, increment);
  }
}

// 로컬 저장소에서 좋아요 토글 (폴백)
function toggleLocalLike(imageId: string, isLiked: boolean, increment: number = 1): boolean {
  const images = getLocalSharedImages();
  const imageIndex = images.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) return false;
  
  // 좋아요 토글
  if (isLiked) {
    // 좋아요 취소 (1씩 감소)
    images[imageIndex].likes = (images[imageIndex].likes || 0) - increment;
  } else {
    // 좋아요 추가 (1씩 증가)
    images[imageIndex].likes = (images[imageIndex].likes || 0) + increment;
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
    await supabase.rpc('set_current_user_id', { user_id: userId });
    
    // Supabase에 댓글 추가 - 올바른 테이블과 필드 이름 사용
    const { data, error } = await supabase
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
    // URL 파싱 오류 방지
    let shouldInvalidateCache = false;
    try {
      const url = new URL(request.url);
      process.env.NEXT_PUBLIC_REQUEST_URL = request.url;
      
      // 타임스탬프 또는 강제 새로고침 파라미터 확인
      if (url.searchParams.has('t') || url.searchParams.has('force_refresh')) {
        console.log("타임스탬프/강제 새로고침 파라미터 감지됨 - 캐시 초기화");
        shouldInvalidateCache = true;
      }
    } catch (urlError) {
      console.warn("URL 파싱 중 오류 발생:", urlError);
      // URL 파싱 오류가 발생해도 계속 진행
    }
    
    // 캐시 무효화가 필요한 경우
    if (shouldInvalidateCache) {
      invalidateCache();
    }
    
    // 공유 이미지 데이터 가져오기
    const sharedImages = await getSharedImages();
    
    return NextResponse.json({
      success: true,
      data: sharedImages,
      timestamp: new Date().toISOString(),
      source: sharedImagesCache ? 'cache' : 'fresh'
    });
  } catch (error) {
    console.error('GET 요청 처리 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 좋아요 API
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, imageId, image_id, userId, user_id, userName, user_name, text, increment = 1, commentId } = data;
    
    if (action === 'like') {
      // 좋아요/좋아요 취소 처리
      const likeImageId = imageId || image_id; // 두 버전 모두 지원
      const likeUserId = userId || user_id; // 두 버전 모두 지원
      
      if (!likeImageId || !likeUserId) {
        return NextResponse.json({ 
          success: false, 
          error: "Image ID and User ID are required" 
        }, { status: 400 });
      }
      
      const isLiked = data.isLiked || false;
      const result = await toggleLike(likeImageId, likeUserId, isLiked, increment);
      
      return NextResponse.json({ 
        success: result, 
        message: isLiked ? "Like removed" : "Like added"
      });
    } 
    else if (action === 'comment') {
      // 댓글 추가 처리
      const commentImageId = imageId || image_id; // 두 버전 모두 지원
      const commentUserId = userId || user_id; // 두 버전 모두 지원
      const commentUserName = userName || user_name || 'Anonymous User'; // 두 버전 모두 지원
      
      if (!commentImageId || !commentUserId || !text) {
        console.error("필수 필드 누락:", { imageId: commentImageId, userId: commentUserId, text });
        return NextResponse.json({ 
          success: false, 
          error: "Image ID, User ID and Comment text are required" 
        }, { status: 400 });
      }
      
      const comment = await addComment(commentImageId, commentUserId, commentUserName, text);
      
      return NextResponse.json({ 
        success: !!comment, 
        data: comment,
        message: comment ? "Comment added" : "Failed to add comment"
      });
    }
    else if (action === 'delete') {
      // 이미지 ID 확인
      if (!imageId) {
        return NextResponse.json({
          success: false,
          error: 'Image ID is required'
        }, { status: 400 });
      }
      
      console.log(`Attempting to delete image with ID: ${imageId}, requested by user: ${userId}`);
      
      try {
        // 요청한 사용자 ID 설정 (RLS 정책용)
        await supabase.rpc('set_current_user_id', { user_id: userId || user_id });
        
        // 1. 첫번째 시도: Supabase shared_images 테이블에서 삭제
        const { error: supabaseError } = await supabase
          .from('shared_images')
          .delete()
          .eq('id', imageId);
        
        if (supabaseError) {
          console.log(`Supabase delete failed, trying DB delete: ${supabaseError.message}`);
        } else {
          console.log(`Image deleted successfully from Supabase: ${imageId}`);
        }
        
        // 2. 두번째 시도: DRM generations 테이블에서 삭제
        try {
          // 해당 이미지 조회 (존재 확인)
          const existingImage = await db.select()
            .from(generations)
            .where(eq(generations.id, imageId))
            .limit(1);
          
          if (existingImage.length === 0) {
            console.log(`Image not found in local DB: ${imageId}`);
          } else {
            console.log(`Image found in local DB: ${imageId}`);
            
            // 이미지 삭제
            await db.delete(generations)
              .where(eq(generations.id, imageId));
            
            console.log(`Image deleted successfully from local DB: ${imageId}`);
          }
        } catch (dbError) {
          console.error(`Error deleting from local DB: ${dbError}`);
          // 실패해도 계속 진행
        }
        
        // 3. 마지막 시도: 로컬 저장소에서 삭제
        const images = getLocalSharedImages();
        const imageIndex = images.findIndex(img => img.id === imageId);
        
        if (imageIndex !== -1) {
          console.log(`Image found in local storage: ${imageId}`);
          images.splice(imageIndex, 1);
          sharedImagesCache = images;
          saveSharedImages(images);
          console.log(`Image deleted successfully from local storage: ${imageId}`);
        } else {
          console.log(`Image not found in local storage: ${imageId}`);
        }
        
        // 성공 응답 (어디에서든 삭제 시도했으므로 성공으로 처리)
        return NextResponse.json({
          success: true,
          message: 'Image deletion attempted'
        });
      } catch (error) {
        console.error(`Error deleting image: ${error}`);
        return NextResponse.json({
          success: false, 
          error: `Failed to delete image: ${error}`
        }, { status: 500 });
      }
    }
    else if (action === 'deleteComment') {
      // 필수 필드 확인
      if (!commentId || !imageId) {
        return NextResponse.json({
          success: false,
          error: 'Comment ID and Image ID are required'
        }, { status: 400 });
      }
      
      console.log(`Attempting to delete comment with ID: ${commentId}, imageId: ${imageId}`);
      
      try {
        // 요청한 사용자 ID 설정 (RLS 정책용)
        await supabase.rpc('set_current_user_id', { user_id: userId || user_id });
        
        // 1. Supabase에서 댓글 삭제
        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
        
        if (deleteError) {
          console.log(`Supabase comment delete failed: ${deleteError.message}`);
        } else {
          console.log(`Comment deleted successfully from Supabase: ${commentId}`);
        }
        
        // 2. 로컬 저장소에서 댓글 삭제 시도
        const images = getLocalSharedImages();
        let commentDeleted = false;
        
        for (const img of images) {
          if (img.id === imageId && img.comments) {
            const commentIndex = img.comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
              img.comments.splice(commentIndex, 1);
              commentDeleted = true;
              break;
            }
          }
        }
        
        if (commentDeleted) {
          sharedImagesCache = images;
          saveSharedImages(images);
          console.log(`Comment deleted successfully from local storage: ${commentId}`);
        } else {
          console.log(`Comment not found in local storage: ${commentId}`);
        }
        
        // 항상 성공 응답 (어디에서든 삭제 시도했으므로)
        return NextResponse.json({
          success: true,
          message: 'Comment deleted successfully'
        });
      } catch (error) {
        console.error(`Error deleting comment: ${error}`);
        return NextResponse.json({
          success: false,
          error: `Failed to delete comment: ${error}`
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "Invalid action" 
    }, { status: 400 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An error occurred while processing the request" 
    }, { status: 400 });
  }
} 