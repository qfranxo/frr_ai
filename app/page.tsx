import MainPageClient from '@/components/home/MainPageClient';
import { CommunityPost } from "@/types/post";
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

// 캐시된 게시물 가져오기 함수
const getCachedPosts = unstable_cache(
  async () => {
    try {
      const { data, error } = await supabase
        .from('shared_images')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Supabase 쿼리 오류:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('데이터 페칭 오류:', error);
      return [];
    }
  },
  ['shared-posts'],
  {
    revalidate: 60,
    tags: ['posts']
  }
);

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
    'professional': '👔',
    'natural': '🌿',
    'modern-chic': '🕶️',
    'artistic': '🎨',
    'minimal': '◻️'
  };
  
  return categoryIcons[category?.toLowerCase()] || '✨';
}

// 댓글 작성자 이름 표시 함수
function getCommentAuthorName(userName: string = ''): string {
  if (!userName || userName === '') {
    return 'User';
  }
  
  if (userName.includes('@')) {
    return userName.split('@')[0];
  }
  
  return userName;
}

// 게시물 데이터 변환 함수
async function getSharedPosts(): Promise<CommunityPost[]> {
  try {
    const posts = await getCachedPosts();
    
    if (!posts.length) {
      return [];
    }

    return posts.map((item: any) => ({
      id: item.id,
      title: item.prompt?.split(',')[0] || 'AI Generated Image',
      description: item.prompt || '',
      imageUrl: item.image_url || '/fallback-image.png',
      aspectRatio: item.aspect_ratio || '3:4',
      author: item.user_id || 'anonymous',
      userId: item.user_id,
      category: item.category || 'portrait',
      style: {
        id: item.category || 'default',
        name: item.rendering_style || item.category || 'Default Style',
        icon: getCategoryIcon(item.category),
        description: `${item.rendering_style || item.category || 'Default'} style image`
      },
      tags: item.category ? [item.category] : [],
      comments: Array.isArray(item.comments) ? item.comments.map((comment: any) => ({
        id: comment.id,
        text: comment.text || comment.content || '',
        content: comment.text || comment.content || '',
        author: getCommentAuthorName(comment.userName || comment.user_id),
        userName: comment.userName || comment.user_id || getCommentAuthorName(comment.userName || comment.user_id),
        userId: comment.userId || comment.user_id || '',
        imageId: String(item.id),
        createdAt: comment.createdAt || comment.created_at || new Date().toISOString()
      })) : [],
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Posts 변환 오류:', error);
    return [];
  }
}

export default async function Page() {
    const posts = await getSharedPosts();
    
    return (
        <main className="min-h-screen relative">
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