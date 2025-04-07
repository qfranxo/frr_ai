import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import * as adminUtils from '@/lib/admin-utils';
import { User } from '@clerk/nextjs/server';

// 관리자 사용자 ID 배열 - 실제 배포에서는 환경 변수나 데이터베이스에서 가져오는 것이 좋음
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',') || [];

// 관리자 여부 확인
function isAdmin(userId?: string | null): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

// 사용자 목록 조회 API
export async function GET(request: Request) {
  try {
    // 인증된 사용자 정보 가져오기
    const { userId } = await auth();
    
    // 관리자만 접근 가능
    if (!isAdmin(userId)) {
      return NextResponse.json({
        success: false,
        error: "관리자만 접근할 수 있습니다."
      }, { status: 403 });
    }
    
    // URL 파라미터 파싱
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Clerk에서 사용자 목록 가져오기 (v6 문법 적용)
    const clerk = await clerkClient();
    const usersResponse = await clerk.users.getUserList({
      limit,
      offset
    });
    
    // v6에서는 usersResponse.data로 사용자 배열에 접근
    const users = usersResponse.data || [];
    
    // 각 사용자의 사용량 데이터 가져오기
    const usersWithUsage = await Promise.all(
      users.map(async (user: User) => {
        const usageLogs = await adminUtils.getUserLogs(user.id);
        
        return {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '이메일 없음',
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          imageCount: usageLogs.filter(log => log.action_type === 'generate').length,
          usageLogs: usageLogs.slice(0, 5) // 최근 5개 로그만 포함
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: usersWithUsage,
      count: users.length,
      totalCount: usersResponse.totalCount || users.length // v6에서는 totalCount 필드 사용
    });
  } catch (error) {
    console.error('관리자 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: "요청 처리 중 오류가 발생했습니다."
    }, { status: 500 });
  }
} 