import MainPageClient from '@/components/home/MainPageClient';
import { BlobAnimation } from "@/components/ui/blob-animation";
import { CommunityPost } from "@/types/post";
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

async function getSharedPosts(): Promise<CommunityPost[]> {
    try {
        let posts: any[] = [];
        
        // 서버 사이드에서 직접 데이터 가져오기 시도
        if (typeof window === 'undefined') {
            try {
                console.log("서버 사이드에서 직접 데이터 가져오기");
                
                // Supabase에서 직접 데이터 가져오기 시도
                try {
                    // 타임스탬프 추가로 캐시 방지
                    const timestamp = Date.now();
                    // 절대 URL 사용 (상대 URL은 서버 사이드 렌더링에서 오류 발생)
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
                    const response = await fetch(`${baseUrl}/api/community?t=${timestamp}&force_refresh=true`, { 
                        cache: 'no-store',
                        next: { revalidate: 0 }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            posts = data.data;
                            console.log(`API에서 ${posts.length}개 데이터 로드 성공`);
                        }
                    }
                } catch (apiError) {
                    console.error("서버 API 호출 오류:", apiError);
                }
                
                // API 호출 실패 시 파일 시스템에서 직접 로드 시도
                if (!posts || posts.length === 0) {
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'shared-images.json');
                        
                        if (fs.existsSync(DATA_FILE_PATH)) {
                            const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf8');
                            posts = JSON.parse(rawData);
                            console.log(`로컬 파일에서 ${posts.length}개 데이터 로드 성공`);
                        } else {
                            console.log("데이터 파일이 존재하지 않음 - 샘플 데이터 사용");
                        }
                    } catch (fsError) {
                        console.log("파일 시스템 접근 실패:", fsError);
                    }
                }
                
                // 데이터가 없을 경우 샘플 데이터 사용
                if (!posts || posts.length === 0) {
                    console.log("샘플 데이터를 대신 사용합니다");
                    return getSamplePosts();
                }
            } catch (serverError) {
                console.error("서버 사이드 데이터 로드 오류:", serverError);
            }
        } else {
            // 클라이언트 사이드에서는 API 엔드포인트 호출
            try {
                console.log("클라이언트 사이드에서 API 호출");
                // 타임스탬프 추가로 캐시 방지
                const timestamp = Date.now();
                const response = await fetch(`/api/community?t=${timestamp}`, { 
                    cache: 'no-store',
                    next: { revalidate: 0 }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        posts = data.data;
                    }
                }
            } catch (clientError) {
                console.error("클라이언트 API 호출 오류:", clientError);
            }
        }
        
        // 데이터를 가져왔다면 변환 수행
        if (posts && posts.length > 0) {
            console.log(`${posts.length}개 게시물 변환 중`);
            return posts.map((item: any) => ({
                id: item.id,
                title: item.prompt?.split(',')[0] || 'AI Generated Image',
                description: item.prompt || '',
                imageUrl: item.imageUrl,
                aspectRatio: item.aspectRatio || '3:4',
                author: item.userId || 'anonymous',
                category: item.category || 'portrait',
                style: {
                    id: item.category || 'default',
                    name: item.renderingStyle || item.category || 'Default Style',
                    icon: getCategoryIcon(item.category),
                    description: `${item.renderingStyle || item.category || 'Default'} style image`
                },
                tags: item.category ? [item.category] : [],
                likes: item.likes || 0,
                comments: Array.isArray(item.comments) ? item.comments.map((comment: any) => ({
                    id: comment.id,
                    text: comment.text || comment.content,
                    author: getCommentAuthorName(comment.userName || comment.userId),
                    createdAt: comment.createdAt
                })) : [],
                createdAt: item.createdAt
            }));
        }
        
        // 데이터 가져오기 실패 시 샘플 데이터 반환
        console.log("데이터 가져오기 실패 - 샘플 데이터 사용");
        return getSamplePosts();
    } catch (error) {
        console.error('Posts 가져오기 오류:', error);
        return getSamplePosts();
    }
}

// 샘플 포스트 데이터 (API 연결 실패 시 폴백)
function getSamplePosts(): CommunityPost[] {
    return [
        {
            id: 'sample-1',
            title: 'Business Professional',
            description: 'Professional female portrait with business attire and natural office lighting',
            imageUrl: 'https://replicate.delivery/pbxt/4EbhJzpPly8SWqRdiiM54NvUcyhhnDKkcL4D9H5HzWlKhbHjA/out-0.png',
            aspectRatio: '1:1',
            author: 'demo_user',
            category: 'portrait',
            style: {
                id: 'portrait',
                name: 'Professional',
                icon: '👤',
                description: 'Professional business portrait style'
            },
            tags: ['portrait', 'professional'],
            likes: 342,
            comments: [
                {
                    id: 'sample-comment-1',
                    text: '우리 브랜드와 잘 어울릴 것 같아요!',
                    author: '마케터',
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: 'sample-2',
            title: 'Urban Style',
            description: 'Young man in casual attire with black hat, natural daylight',
            imageUrl: 'https://replicate.delivery/pbxt/0RUkJcPMsGqRAoiEJCpVCZjEwlTsWOwL9ZMOSs2gGwQm4VJjA/out-0.png',
            aspectRatio: '1:1',
            author: 'demo_user',
            category: 'portrait',
            style: {
                id: 'portrait',
                name: 'Natural',
                icon: '👤',
                description: 'Natural casual portrait style'
            },
            tags: ['portrait', 'casual'],
            likes: 289,
            comments: [
                {
                    id: 'sample-comment-2',
                    text: '이 스타일 정말 트렌디하네요!',
                    author: '패션디자이너',
                    createdAt: new Date(Date.now() - 7200000).toISOString()
                }
            ],
            createdAt: new Date(Date.now() - 3600000).toISOString()
        }
    ];
}

// 카테고리에 따른 아이콘 반환 함수
function getCategoryIcon(category: string = ''): string {
  const categoryIcons: Record<string, string> = {
    'portrait': '👤',
    'landscape': '🏞️',
    'anime': '🎨',
    'fantasy': '🧙‍♂️',
    'urban': '🏙️',
    'animals': '🐾',
    'abstract': '🎭',
    'sci-fi': '🚀', 
    'vintage': '📷',
    'realistic': '📸',
    'high-fashion': '👗',
    'professional': '💼',
    'natural': '🌿',
    'modern-chic': '🕶️',
    'artistic': '🎨',
    'minimal': '◻️'
  };
  
  return categoryIcons[category.toLowerCase()] || '✨';
}

// 댓글 작성자 이름 표시 함수 - 서버 컴포넌트 버전 (클라이언트 컴포넌트에서 실제 구현이 이루어집니다)
function getCommentAuthorName(userName: string = ''): string {
  // 서버 컴포넌트에서는 간단히 userName 반환
  if (!userName || userName === '') {
    return '사용자';
  }
  
  // 이메일 형식인 경우 @ 앞부분만 반환
  if (userName.includes('@')) {
    return userName.split('@')[0];
  }
  
  // 기본적으로 userName 반환
  return userName;
}

export default async function Page() {
    const posts = await getSharedPosts();
    
    return (
        <main className="min-h-screen relative">
            <BlobAnimation />
            <div className="relative z-10">
                <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>}>
                    <MainPageClient posts={posts} />
                </Suspense>
            </div>
        </main>
    );
}