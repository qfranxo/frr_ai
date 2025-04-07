import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as adminUtils from '@/lib/admin-utils';

// 관리자 사용자 ID 배열 - 실제 배포에서는 환경 변수나 데이터베이스에서 가져오는 것이 좋음
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',') || [];

// 관리자 여부 확인
function isAdmin(userId?: string | null): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

// 관리자 로그 조회 API
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
    const userIdFilter = url.searchParams.get('userId');
    
    // 데이터 조회
    let data;
    if (userIdFilter) {
      data = await adminUtils.getUserLogs(userIdFilter);
    } else {
      data = await adminUtils.getAllUsageLogs(limit, offset);
    }
    
    return NextResponse.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    console.error('관리자 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: "요청 처리 중 오류가 발생했습니다."
    }, { status: 500 });
  }
} 